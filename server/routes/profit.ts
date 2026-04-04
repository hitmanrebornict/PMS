import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer } from '../middleware/authorize.js';

const router = Router();

function toNum(v: any): number {
  return v != null ? Number(v) : 0;
}

// GET /api/profit?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const fromStr = req.query.from as string | undefined;
  const toStr   = req.query.to   as string | undefined;

  const from = fromStr ? new Date(fromStr + 'T00:00:00.000Z') : defaultFrom;
  const to   = toStr   ? new Date(toStr   + 'T23:59:59.999Z') : defaultTo;

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    res.status(400).json({ error: 'Invalid date parameters' });
    return;
  }

  try {
    // 1. Paid invoices for unit-based leases within period (cash basis: paidAt in range)
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: from, lte: to },
        lease: { unitId: { not: null } },
      },
      include: {
        lease: {
          include: {
            unit: {
              include: { property: { select: { id: true, name: true, address: true } } },
            },
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    // 2. Paid invoices for carpark-based leases within period
    const carparkInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: from, lte: to },
        lease: { carparkId: { not: null } },
      },
      include: {
        lease: { include: { carpark: { select: { id: true, carparkNumber: true } } } },
      },
      orderBy: { paidAt: 'asc' },
    });

    // 3. Expenses within period (expenseDate in range)
    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
      include: {
        unit: { include: { property: { select: { id: true, name: true } } } },
        expenseType: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: 'asc' },
    });

    // ── Build property > unit map ──────────────────────────────────────────

    // Collect all property/unit combos that appear in invoices or expenses
    const propertyMap = new Map<string, {
      id: string; name: string; address: string;
      units: Map<string, {
        id: string; unitNumber: string;
        invoices: any[]; expenses: any[];
      }>;
    }>();

    const ensureUnit = (prop: { id: string; name: string; address?: string | null }, unit: { id: string; unitNumber: string }) => {
      if (!propertyMap.has(prop.id)) {
        propertyMap.set(prop.id, { id: prop.id, name: prop.name, address: prop.address ?? '', units: new Map() });
      }
      const pEntry = propertyMap.get(prop.id)!;
      if (!pEntry.units.has(unit.id)) {
        pEntry.units.set(unit.id, { id: unit.id, unitNumber: unit.unitNumber, invoices: [], expenses: [] });
      }
      return pEntry.units.get(unit.id)!;
    };

    for (const inv of paidInvoices) {
      const unit = inv.lease.unit!;
      const prop = unit.property;
      const uEntry = ensureUnit(prop, unit);
      uEntry.invoices.push({
        id: inv.id,
        amount: toNum(inv.amount),
        paidAt: inv.paidAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
      });
    }

    for (const exp of expenses) {
      const unit = exp.unit;
      const prop = unit.property;
      const uEntry = ensureUnit(prop, unit);
      uEntry.expenses.push({
        id: exp.id,
        amount: toNum(exp.amount),
        description: exp.description,
        expenseDate: exp.expenseDate,
        expenseType: exp.expenseType,
      });
    }

    // ── Compute totals ─────────────────────────────────────────────────────

    const properties = Array.from(propertyMap.values()).map((p) => {
      const units = Array.from(p.units.values()).map((u) => {
        const totalIncome   = u.invoices.reduce((s: number, i: any) => s + i.amount, 0);
        const totalExpenses = u.expenses.reduce((s: number, e: any) => s + e.amount, 0);
        return { ...u, invoices: u.invoices, expenses: u.expenses, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
      });
      const totalIncome   = units.reduce((s, u) => s + u.totalIncome, 0);
      const totalExpenses = units.reduce((s, u) => s + u.totalExpenses, 0);
      return { id: p.id, name: p.name, address: p.address, units, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
    });

    const carparkIncome = carparkInvoices.reduce((s, inv) => s + toNum(inv.amount), 0);
    const carparkRows   = carparkInvoices.map((inv) => ({
      id: inv.id,
      amount: toNum(inv.amount),
      paidAt: inv.paidAt,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      carparkNumber: inv.lease.carpark?.carparkNumber ?? '',
    }));

    const totalIncome   = properties.reduce((s, p) => s + p.totalIncome, 0) + carparkIncome;
    const totalExpenses = properties.reduce((s, p) => s + p.totalExpenses, 0);
    const netProfit     = totalIncome - totalExpenses;

    res.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: { totalIncome, totalExpenses, netProfit },
      properties,
      carparkIncome,
      carparkRows,
    });
  } catch (err) {
    console.error('Profit summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
