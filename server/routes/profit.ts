import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer } from '../middleware/authorize.js';

const router = Router();

function toNum(v: any): number {
  return v != null ? Number(v) : 0;
}

// ── Room type monthly YTD endpoint ───────────────────────────────────────────
// GET /api/profit/monthly/roomtype?year=2026&propertyId=&unitId=

router.get('/monthly/roomtype', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const yearStr = req.query.year as string | undefined;
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
  if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return; }

  const propertyId = req.query.propertyId as string | undefined;
  const unitId     = req.query.unitId     as string | undefined;

  const from = new Date(Date.UTC(year, 0, 1));
  const to   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  try {
    const unitLeaseWhere: any = { unitId: { not: null } };
    if (unitId)          unitLeaseWhere.unitId = unitId;
    else if (propertyId) unitLeaseWhere.unit = { propertyId };

    const expWhere: any = { expenseDate: { gte: from, lte: to }, isActive: true };
    if (unitId)          expWhere.unitId = unitId;
    else if (propertyId) expWhere.unit = { propertyId };

    const [unitInvoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: 'PAID', paidAt: { gte: from, lte: to }, lease: unitLeaseWhere },
        select: {
          paidAt: true, amount: true,
          lease: { select: { unit: { select: { type: true } } } },
        },
      }),
      prisma.expense.findMany({
        where: expWhere,
        select: { expenseDate: true, amount: true, unit: { select: { type: true } } },
      }),
    ]);

    // Map: month → roomType → { income, expenses }
    const matrix: Map<number, Map<string, { income: number; expenses: number }>> = new Map();
    const roomTypeSet = new Set<string>();

    for (let m = 0; m < 12; m++) matrix.set(m, new Map());

    const ensureCell = (m: number, rt: string) => {
      if (!matrix.get(m)!.has(rt)) matrix.get(m)!.set(rt, { income: 0, expenses: 0 });
      return matrix.get(m)!.get(rt)!;
    };

    for (const inv of unitInvoices) {
      if (!inv.paidAt || !inv.lease?.unit?.type) continue;
      const m = new Date(inv.paidAt).getUTCMonth();
      const rt = inv.lease.unit.type;
      roomTypeSet.add(rt);
      ensureCell(m, rt).income += toNum(inv.amount);
    }

    for (const exp of expenses) {
      if (!exp.unit?.type) continue;
      const m = new Date(exp.expenseDate).getUTCMonth();
      const rt = exp.unit.type;
      roomTypeSet.add(rt);
      ensureCell(m, rt).expenses += toNum(exp.amount);
    }

    const roomTypes = Array.from(roomTypeSet);

    const months = Array.from({ length: 12 }, (_, m) => {
      const row: any = {
        month: new Date(Date.UTC(year, m, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        monthIndex: m,
      };
      for (const rt of roomTypes) {
        const cell = matrix.get(m)?.get(rt);
        row[rt] = cell ? cell.income - cell.expenses : 0;
      }
      return row;
    });

    res.json({ year, months, roomTypes });
  } catch (err) {
    console.error('Room type monthly profit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Monthly YTD endpoint ──────────────────────────────────────────────────────
// GET /api/profit/monthly?year=2026&propertyId=&unitId=&carparkId=

router.get('/monthly', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const yearStr = req.query.year as string | undefined;
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
  if (isNaN(year)) { res.status(400).json({ error: 'Invalid year' }); return; }

  const propertyId = req.query.propertyId as string | undefined;
  const unitId     = req.query.unitId     as string | undefined;
  const carparkId  = req.query.carparkId  as string | undefined;

  const from = new Date(Date.UTC(year, 0, 1));
  const to   = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  try {
    // Build lease filter for unit invoices
    const unitLeaseWhere: any = { unitId: { not: null } };
    if (unitId)     unitLeaseWhere.unitId = unitId;
    else if (propertyId) unitLeaseWhere.unit = { propertyId };

    // Build lease filter for carpark invoices
    const carparkLeaseWhere: any = { carparkId: { not: null } };
    if (carparkId) carparkLeaseWhere.carparkId = carparkId;

    // Build expense filter
    const expWhere: any = { expenseDate: { gte: from, lte: to }, isActive: true };
    if (unitId)     expWhere.unitId = unitId;
    else if (propertyId) expWhere.unit = { propertyId };

    const [unitInvoices, carparkInvoices, expenses] = await Promise.all([
      carparkId
        ? Promise.resolve([] as { paidAt: Date | null; amount: any }[])
        : prisma.invoice.findMany({
            where: { status: 'PAID', paidAt: { gte: from, lte: to }, lease: unitLeaseWhere },
            select: { paidAt: true, amount: true },
          }),
      (unitId || propertyId)
        ? Promise.resolve([] as { paidAt: Date | null; amount: any }[])
        : prisma.invoice.findMany({
            where: { status: 'PAID', paidAt: { gte: from, lte: to }, lease: carparkLeaseWhere },
            select: { paidAt: true, amount: true },
          }),
      carparkId
        ? Promise.resolve([] as { expenseDate: Date; amount: any }[])
        : prisma.expense.findMany({ where: expWhere, select: { expenseDate: true, amount: true } }),
    ]);

    const months = Array.from({ length: 12 }, (_, m) => ({
      month: new Date(Date.UTC(year, m, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      monthIndex: m,
      income: 0,
      expenses: 0,
      netProfit: 0,
    }));

    for (const inv of unitInvoices) {
      if (inv.paidAt) months[new Date(inv.paidAt).getUTCMonth()].income += toNum(inv.amount);
    }
    for (const inv of carparkInvoices) {
      if (inv.paidAt) months[new Date(inv.paidAt).getUTCMonth()].income += toNum(inv.amount);
    }
    for (const exp of expenses) {
      months[new Date(exp.expenseDate).getUTCMonth()].expenses += toNum(exp.amount);
    }
    for (const m of months) m.netProfit = m.income - m.expenses;

    res.json({ year, months });
  } catch (err) {
    console.error('Monthly profit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Main profit endpoint ──────────────────────────────────────────────────────
// GET /api/profit?from=YYYY-MM-DD&to=YYYY-MM-DD&propertyId=&unitId=&carparkId=

router.get('/', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultTo   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const fromStr = req.query.from as string | undefined;
  const toStr   = req.query.to   as string | undefined;

  const from = fromStr ? new Date(fromStr + 'T00:00:00.000Z') : defaultFrom;
  const to   = toStr   ? new Date(toStr   + 'T23:59:59.999Z') : defaultTo;

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    res.status(400).json({ error: 'Invalid date parameters' });
    return;
  }

  const propertyId = req.query.propertyId as string | undefined;
  const unitId     = req.query.unitId     as string | undefined;
  const carparkId  = req.query.carparkId  as string | undefined;

  try {
    // Build lease filter for unit invoices
    const unitLeaseWhere: any = { unitId: { not: null } };
    if (unitId)          unitLeaseWhere.unitId = unitId;
    else if (propertyId) unitLeaseWhere.unit = { propertyId };

    // Build expense filter
    const expWhere: any = { expenseDate: { gte: from, lte: to }, isActive: true };
    if (unitId)          expWhere.unitId = unitId;
    else if (propertyId) expWhere.unit = { propertyId };

    // 1. Paid invoices for unit-based leases within period
    const paidInvoices = carparkId ? [] : await prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: from, lte: to }, lease: unitLeaseWhere },
      include: {
        lease: {
          include: {
            unit: {
              select: {
                id: true,
                unitNumber: true,
                type: true,
                property: { select: { id: true, name: true, address: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    // 2. Paid invoices for carpark-based leases within period
    const carparkLeaseWhere: any = { carparkId: { not: null } };
    if (carparkId) carparkLeaseWhere.carparkId = carparkId;

    const carparkInvoices = (unitId || propertyId) ? [] : await prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: from, lte: to }, lease: carparkLeaseWhere },
      include: {
        lease: { include: { carpark: { select: { id: true, carparkNumber: true } } } },
      },
      orderBy: { paidAt: 'asc' },
    });

    // 3. Expenses within period
    const expenses = carparkId ? [] : await prisma.expense.findMany({
      where: expWhere,
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            type: true,
            property: { select: { id: true, name: true } },
          },
        },
        expenseType: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: 'asc' },
    });

    // ── Build property > unit map ─────────────────────────────────────────────

    const propertyMap = new Map<string, {
      id: string; name: string; address: string;
      units: Map<string, {
        id: string; unitNumber: string; unitType: string;
        invoices: any[]; expenses: any[];
      }>;
    }>();

    const ensureUnit = (
      prop: { id: string; name: string; address?: string | null },
      unit: { id: string; unitNumber: string; type: string }
    ) => {
      if (!propertyMap.has(prop.id)) {
        propertyMap.set(prop.id, { id: prop.id, name: prop.name, address: prop.address ?? '', units: new Map() });
      }
      const pEntry = propertyMap.get(prop.id)!;
      if (!pEntry.units.has(unit.id)) {
        pEntry.units.set(unit.id, { id: unit.id, unitNumber: unit.unitNumber, unitType: unit.type, invoices: [], expenses: [] });
      }
      return pEntry.units.get(unit.id)!;
    };

    for (const inv of paidInvoices) {
      const unit = inv.lease.unit!;
      const prop = unit.property;
      const uEntry = ensureUnit(prop, { id: unit.id, unitNumber: unit.unitNumber, type: unit.type });
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
      const uEntry = ensureUnit(prop, { id: unit.id, unitNumber: unit.unitNumber, type: unit.type });
      uEntry.expenses.push({
        id: exp.id,
        amount: toNum(exp.amount),
        description: exp.description,
        expenseDate: exp.expenseDate,
        expenseType: exp.expenseType,
      });
    }

    // ── Compute totals ────────────────────────────────────────────────────────

    const properties = Array.from(propertyMap.values()).map((p) => {
      const units = Array.from(p.units.values()).map((u) => {
        const totalIncome   = u.invoices.reduce((s: number, i: any) => s + i.amount, 0);
        const totalExpenses = u.expenses.reduce((s: number, e: any) => s + e.amount, 0);
        return { ...u, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
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
