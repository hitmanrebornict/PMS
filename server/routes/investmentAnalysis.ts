import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer } from '../middleware/authorize.js';

const router = Router();

function toNum(v: any): number {
  return v != null ? Number(v) : 0;
}

// Build monthly income/expense maps for a unit from a given start date
async function getUnitMonthlyData(unitId: string, from: Date) {
  const [invoiceRows, expenseRows] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: from }, lease: { unitId } },
      select: { paidAt: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { unitId, expenseDate: { gte: from }, isActive: true },
      select: { expenseDate: true, amount: true },
    }),
  ]);

  const income   = new Map<string, number>();
  const expenses = new Map<string, number>();

  for (const inv of invoiceRows) {
    if (!inv.paidAt) continue;
    const d = new Date(inv.paidAt);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    income.set(k, (income.get(k) ?? 0) + toNum(inv.amount));
  }
  for (const exp of expenseRows) {
    const d = new Date(exp.expenseDate);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    expenses.set(k, (expenses.get(k) ?? 0) + toNum(exp.amount));
  }

  return { income, expenses };
}

// GET /api/investment-analysis — summary list of units with investments
router.get('/', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const investments = await (prisma as any).investment.findMany({
      where: { isActive: true },
      include: {
        unit: {
          select: {
            id: true, unitNumber: true, type: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Group by unit
    const unitMap = new Map<string, {
      unit: any;
      investments: any[];
      totalCapital: number;
      earliestStart: Date;
    }>();

    for (const inv of investments) {
      if (!inv.unit) continue;
      const uid = inv.unit.id;
      if (!unitMap.has(uid)) {
        unitMap.set(uid, { unit: inv.unit, investments: [], totalCapital: 0, earliestStart: new Date(inv.startDate) });
      }
      const entry = unitMap.get(uid)!;
      entry.investments.push(inv);
      entry.totalCapital += toNum(inv.capitalAmount);
      const s = new Date(inv.startDate);
      if (s < entry.earliestStart) entry.earliestStart = s;
    }

    const results = await Promise.all(
      Array.from(unitMap.entries()).map(async ([unitId, entry]) => {
        const { income, expenses } = await getUnitMonthlyData(unitId, entry.earliestStart);
        const totalIncome   = Array.from(income.values()).reduce((s, v) => s + v, 0);
        const totalExpenses = Array.from(expenses.values()).reduce((s, v) => s + v, 0);
        const totalProfit   = totalIncome - totalExpenses;
        return {
          unitId,
          unitNumber:    entry.unit.unitNumber,
          propertyName:  entry.unit.property?.name ?? '',
          unitType:      entry.unit.type,
          investmentCount: entry.investments.length,
          totalCapital:  entry.totalCapital,
          totalProfit,
          breakEvenAchieved: totalProfit >= entry.totalCapital,
          earliestStart: entry.earliestStart.toISOString(),
        };
      })
    );

    res.json(results);
  } catch (err) {
    console.error('Investment analysis list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/investment-analysis/:unitId — detailed analysis for a unit
router.get('/:unitId', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const { unitId } = req.params;

  try {
    const unit = await (prisma.unit.findFirst as any)({
      where: { id: unitId, isActive: true },
      include: { property: { select: { id: true, name: true } } },
    });
    if (!unit) { res.status(404).json({ error: 'Unit not found' }); return; }

    const investments = await (prisma as any).investment.findMany({
      where: { unitId, isActive: true },
      include: { customer: { select: { id: true, name: true, icPassport: true } } },
      orderBy: { startDate: 'asc' },
    });
    if (investments.length === 0) { res.status(404).json({ error: 'No investments for this unit' }); return; }

    const totalCapital  = investments.reduce((s: number, i: any) => s + toNum(i.capitalAmount), 0);
    const earliestStart = new Date(investments[0].startDate);
    const now           = new Date();

    // Generate month slots
    const monthSlots: Date[] = [];
    const cur = new Date(Date.UTC(earliestStart.getUTCFullYear(), earliestStart.getUTCMonth(), 1));
    while (cur <= now) {
      monthSlots.push(new Date(cur));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }

    const { income: incomeMap, expenses: expenseMap } = await getUnitMonthlyData(unitId, earliestStart);

    let cumulative = 0;
    const series = monthSlots.map(m => {
      const k = `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`;
      const income   = incomeMap.get(k)   ?? 0;
      const expenses = expenseMap.get(k)  ?? 0;
      const netProfit = income - expenses;
      cumulative += netProfit;
      return {
        label: m.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
        year:  m.getUTCFullYear(),
        month: m.getUTCMonth() + 1,
        income,
        expenses,
        netProfit,
        cumulativeProfit: cumulative,
      };
    });

    const totalProfit  = cumulative;
    const breakEvenIdx = series.findIndex(s => s.cumulativeProfit >= totalCapital);

    res.json({
      unit: {
        id:           unit.id,
        unitNumber:   unit.unitNumber,
        type:         unit.type,
        propertyName: unit.property?.name ?? '',
      },
      investments: investments.map((inv: any) => ({
        id:            inv.id,
        investorName:  inv.customer?.name ?? 'Unknown',
        investorIc:    inv.customer?.icPassport ?? '',
        capitalAmount: toNum(inv.capitalAmount),
        startDate:     inv.startDate,
        endDate:       inv.endDate,
        status:        inv.status,
        notes:         inv.notes ?? '',
      })),
      totalCapital,
      totalProfit,
      series,
      breakEvenMonth: breakEvenIdx >= 0 ? series[breakEvenIdx] : null,
    });
  } catch (err) {
    console.error('Investment analysis detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
