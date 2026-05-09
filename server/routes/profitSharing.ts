import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireProfitSharingOrViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

const saveRecordSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  notes: z.string().optional(),
});

const sharesSchema = z.object({
  shares: z.array(z.object({
    userId: z.string().uuid(),
    percentage: z.number().gt(0).lte(100),
  })),
});

// ─── Largest-remainder profit distribution ────────────────────────────────────
function distributeProfit(finalProfit: number, shares: { percentage: number }[]): number[] {
  if (shares.length === 0) return [];
  const totalCents = Math.round(finalProfit * 100);
  const rawCents = shares.map(s => (s.percentage / 100) * totalCents);
  const floorCents = rawCents.map(Math.floor);
  const remainders = rawCents.map((r, i) => r - floorCents[i]);
  let leftover = totalCents - floorCents.reduce((a, b) => a + b, 0);
  const order = remainders.map((r, i) => ({ r, i })).sort((a, b) => b.r - a.r);
  for (let k = 0; k < leftover; k++) floorCents[order[k].i]++;
  return floorCents.map(c => c / 100);
}

// ─── Helper: verify PROFIT_SHARING user owns a share in a unit ────────────────
async function verifyShareAccess(req: AuthRequest, unitId: string, res: Response): Promise<boolean> {
  if (req.user!.role === 'PROFIT_SHARING') {
    const share: any = await (prisma as any).unitShare.findFirst({
      where: { unitId, userId: req.user!.userId },
    });
    if (!share) {
      res.status(403).json({ error: 'You do not have a share in this unit' });
      return false;
    }
  }
  return true;
}

// GET /api/profit-sharing/shareable-users — list all active users for owner picker
router.get('/shareable-users', authenticate, requireProfitSharingOrViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const users: any[] = await (prisma.user.findMany as any)({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('List shareable users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profit-sharing/units — list active units (filtered for PROFIT_SHARING role)
router.get('/units', authenticate, requireProfitSharingOrViewer, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { isActive: true };
    if (req.user!.role === 'PROFIT_SHARING') {
      where.unitShares = { some: { userId: req.user!.userId } };
    }

    const units: any[] = await (prisma.unit.findMany as any)({
      where,
      include: {
        property: { select: { name: true } },
        profitSharingRecords: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 1,
          select: { month: true, year: true },
        },
        unitShares: { select: { userId: true, percentage: true } },
      },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    });

    res.json(units.map(u => ({
      id: u.id,
      unitNumber: u.unitNumber,
      propertyName: u.property.name,
      type: u.type,
      guaranteeFee: u.guaranteeFee != null ? Number(u.guaranteeFee) : null,
      lastCutoffMonth: u.profitSharingRecords[0]?.month ?? null,
      lastCutoffYear: u.profitSharingRecords[0]?.year ?? null,
      shareCount: u.unitShares.length,
    })));
  } catch (err) {
    console.error('List profit sharing units error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profit-sharing/:unitId/shares — get current ownership for a unit
router.get('/:unitId/shares', authenticate, requireProfitSharingOrViewer, async (req: AuthRequest, res: Response) => {
  const { unitId } = req.params;
  try {
    const shares: any[] = await (prisma as any).unitShare.findMany({
      where: { unitId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json(shares.map(s => ({
      userId: s.userId,
      userName: s.user.name,
      userEmail: s.user.email,
      percentage: Number(s.percentage),
    })));
  } catch (err) {
    console.error('Get unit shares error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/profit-sharing/:unitId/shares — set ownership (MANAGER+ only)
router.put('/:unitId/shares', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const { unitId } = req.params;
  const parsed = sharesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { shares } = parsed.data;

  // Validate total = 100% (or empty = clear all)
  if (shares.length > 0) {
    const total = shares.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      res.status(400).json({ error: `Percentages must sum to 100% (got ${total.toFixed(2)}%)` });
      return;
    }
  }

  try {
    // Verify all users exist
    if (shares.length > 0) {
      const userIds = shares.map(s => s.userId);
      const existingUsers: any[] = await (prisma.user.findMany as any)({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      if (existingUsers.length !== userIds.length) {
        res.status(400).json({ error: 'One or more users do not exist' });
        return;
      }
    }

    await (prisma.$transaction as any)(async (tx: any) => {
      await tx.unitShare.deleteMany({ where: { unitId } });
      if (shares.length > 0) {
        await tx.unitShare.createMany({
          data: shares.map(s => ({
            unitId,
            userId: s.userId,
            percentage: s.percentage,
            updatedAt: new Date(),
          })),
        });
      }
    });

    // Return updated shares
    const updated: any[] = await (prisma as any).unitShare.findMany({
      where: { unitId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json(updated.map(s => ({
      userId: s.userId,
      userName: s.user.name,
      userEmail: s.user.email,
      percentage: Number(s.percentage),
    })));
  } catch (err) {
    console.error('Update unit shares error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profit-sharing/:unitId/calculate?year=&month= — live calculation
router.get('/:unitId/calculate', authenticate, requireProfitSharingOrViewer, async (req: AuthRequest, res: Response) => {
  const { unitId } = req.params;
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    res.status(400).json({ error: 'Valid year and month (1-12) are required' });
    return;
  }

  // PROFIT_SHARING: verify share access
  if (!(await verifyShareAccess(req, unitId, res))) return;

  try {
    const unit: any = await (prisma.unit.findFirst as any)({
      where: { id: unitId, isActive: true },
      include: { property: { select: { name: true } } },
    });
    if (!unit) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const invoices: any[] = await (prisma.invoice.findMany as any)({
      where: {
        status: 'PAID',
        paidAt: { gte: periodStart, lte: periodEnd },
        lease: { unitId },
      },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        periodStart: true,
        periodEnd: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    const expenses: any[] = await (prisma.expense.findMany as any)({
      where: {
        unitId,
        isActive: true,
        expenseDate: { gte: periodStart, lte: periodEnd },
      },
      include: { expenseType: { select: { id: true, name: true } } },
      orderBy: { expenseDate: 'asc' },
    });

    const totalSales = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
    const netProfit = totalSales - totalExpenses;
    const guaranteeFee = unit.guaranteeFee != null ? Number(unit.guaranteeFee) : 0;
    const finalProfit = totalSales >= guaranteeFee ? netProfit : netProfit - guaranteeFee;

    // Get current unit shares
    const unitShares: any[] = await (prisma as any).unitShare.findMany({
      where: { unitId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const projectedAmounts = distributeProfit(finalProfit, unitShares.map(s => ({ percentage: Number(s.percentage) })));
    const sharesWithProjection = unitShares.map((s, i) => ({
      userId: s.userId,
      userName: s.user.name,
      percentage: Number(s.percentage),
      projectedAmount: projectedAmounts[i] ?? 0,
    }));

    // Check if a saved record already exists for this period
    const savedRecord: any = await (prisma as any).profitSharingRecord.findUnique({
      where: { unitId_month_year: { unitId, month, year } },
      include: { allocations: true },
    });

    res.json({
      unitId,
      unitNumber: unit.unitNumber,
      propertyName: unit.property.name,
      month,
      year,
      guaranteeFee,
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        amount: Number(inv.amount),
        paidAt: inv.paidAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
      })),
      expenses: expenses.map((exp: any) => ({
        id: exp.id,
        amount: Number(exp.amount),
        description: exp.description,
        expenseDate: exp.expenseDate,
        expenseType: exp.expenseType,
      })),
      totalSales,
      totalExpenses,
      netProfit,
      finalProfit,
      shares: sharesWithProjection,
      savedRecord: savedRecord ? {
        id: savedRecord.id,
        guaranteeFeeSnapshot: Number(savedRecord.guaranteeFeeSnapshot),
        totalSales: Number(savedRecord.totalSales),
        totalExpenses: Number(savedRecord.totalExpenses),
        netProfit: Number(savedRecord.netProfit),
        finalProfit: Number(savedRecord.finalProfit),
        notes: savedRecord.notes,
        createdAt: savedRecord.createdAt,
        updatedAt: savedRecord.updatedAt,
        allocations: (savedRecord.allocations ?? []).map((a: any) => ({
          userId: a.userId,
          userName: a.userName,
          percentage: Number(a.percentage),
          amount: Number(a.amount),
        })),
      } : null,
    });
  } catch (err) {
    console.error('Profit sharing calculate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profit-sharing/:unitId/records — save/upsert a cutoff record
router.post('/:unitId/records', authenticate, requireProfitSharingOrViewer, async (req: AuthRequest, res: Response) => {
  const { unitId } = req.params;
  const parsed = saveRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { month, year, notes } = parsed.data;

  // PROFIT_SHARING: verify share access
  if (!(await verifyShareAccess(req, unitId, res))) return;

  try {
    const unit: any = await (prisma.unit.findFirst as any)({
      where: { id: unitId, isActive: true },
    });
    if (!unit) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const invoices: any[] = await (prisma.invoice.findMany as any)({
      where: {
        status: 'PAID',
        paidAt: { gte: periodStart, lte: periodEnd },
        lease: { unitId },
      },
      select: { amount: true },
    });

    const expenses: any[] = await (prisma.expense.findMany as any)({
      where: {
        unitId,
        isActive: true,
        expenseDate: { gte: periodStart, lte: periodEnd },
      },
      select: { amount: true },
    });

    const totalSales = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
    const netProfit = totalSales - totalExpenses;
    const guaranteeFee = unit.guaranteeFee != null ? Number(unit.guaranteeFee) : 0;
    const finalProfit = totalSales >= guaranteeFee ? netProfit : netProfit - guaranteeFee;

    // Fetch current unit shares for snapshot
    const unitShares: any[] = await (prisma as any).unitShare.findMany({
      where: { unitId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const allocatedAmounts = distributeProfit(finalProfit, unitShares.map(s => ({ percentage: Number(s.percentage) })));

    const record: any = await (prisma.$transaction as any)(async (tx: any) => {
      const upserted = await tx.profitSharingRecord.upsert({
        where: { unitId_month_year: { unitId, month, year } },
        update: {
          guaranteeFeeSnapshot: guaranteeFee,
          totalSales,
          totalExpenses,
          netProfit,
          finalProfit,
          notes: notes ?? null,
        },
        create: {
          unitId,
          month,
          year,
          guaranteeFeeSnapshot: guaranteeFee,
          totalSales,
          totalExpenses,
          netProfit,
          finalProfit,
          notes: notes ?? null,
        },
      });

      // Delete existing allocations and recreate
      await tx.profitSharingAllocation.deleteMany({ where: { profitSharingRecordId: upserted.id } });

      if (unitShares.length > 0) {
        await tx.profitSharingAllocation.createMany({
          data: unitShares.map((s, i) => ({
            profitSharingRecordId: upserted.id,
            userId: s.userId,
            userName: s.user.name,
            percentage: Number(s.percentage),
            amount: allocatedAmounts[i] ?? 0,
          })),
        });
      }

      // Re-fetch with allocations
      return tx.profitSharingRecord.findUnique({
        where: { id: upserted.id },
        include: { allocations: true },
      });
    });

    res.json({
      id: record.id,
      unitId: record.unitId,
      month: record.month,
      year: record.year,
      guaranteeFeeSnapshot: Number(record.guaranteeFeeSnapshot),
      totalSales: Number(record.totalSales),
      totalExpenses: Number(record.totalExpenses),
      netProfit: Number(record.netProfit),
      finalProfit: Number(record.finalProfit),
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      allocations: (record.allocations ?? []).map((a: any) => ({
        userId: a.userId,
        userName: a.userName,
        percentage: Number(a.percentage),
        amount: Number(a.amount),
      })),
    });
  } catch (err) {
    console.error('Save profit sharing record error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profit-sharing/:unitId/records — list all saved cutoff records for a unit
router.get('/:unitId/records', authenticate, requireProfitSharingOrViewer, async (req: AuthRequest, res: Response) => {
  const { unitId } = req.params;

  // PROFIT_SHARING: verify share access
  if (!(await verifyShareAccess(req, unitId, res))) return;

  try {
    const records: any[] = await (prisma as any).profitSharingRecord.findMany({
      where: { unitId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: { allocations: true },
    });

    res.json(records.map((r: any) => ({
      id: r.id,
      unitId: r.unitId,
      month: r.month,
      year: r.year,
      guaranteeFeeSnapshot: Number(r.guaranteeFeeSnapshot),
      totalSales: Number(r.totalSales),
      totalExpenses: Number(r.totalExpenses),
      netProfit: Number(r.netProfit),
      finalProfit: Number(r.finalProfit),
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      allocations: (r.allocations ?? []).map((a: any) => ({
        userId: a.userId,
        userName: a.userName,
        percentage: Number(a.percentage),
        amount: Number(a.amount),
      })),
    })));
  } catch (err) {
    console.error('List profit sharing records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
