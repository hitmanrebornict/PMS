import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const investmentSchema = z.object({
  customerId:    z.string().uuid(),
  unitId:        z.string().uuid(),
  capitalAmount: z.number().positive(),
  startDate:     z.string().datetime({ offset: true }).or(z.string().date()),
  endDate:       z.string().datetime({ offset: true }).or(z.string().date()),
  status:        z.enum(['ACTIVE', 'MATURED', 'WITHDRAWN']).optional(),
  notes:         z.string().max(1000).optional(),
});

const updateSchema = z.object({
  capitalAmount: z.number().positive().optional(),
  startDate:     z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  endDate:       z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  status:        z.enum(['ACTIVE', 'MATURED', 'WITHDRAWN']).optional(),
  notes:         z.string().max(1000).optional().nullable(),
});

function toNumber(v: any) { return Number(v); }

function serialize(inv: any) {
  return {
    id:            inv.id,
    customerId:    inv.customerId,
    unitId:        inv.unitId,
    capitalAmount: toNumber(inv.capitalAmount),
    startDate:     inv.startDate.toISOString(),
    endDate:       inv.endDate.toISOString(),
    status:        inv.status,
    notes:         inv.notes ?? null,
    createdAt:     inv.createdAt.toISOString(),
    customer: inv.customer ? {
      id:         inv.customer.id,
      customerNo: inv.customer.customerNo,
      name:       inv.customer.name,
      phoneLocal: inv.customer.phoneLocal,
      icPassport: inv.customer.icPassport,
    } : undefined,
    unit: inv.unit ? {
      id:         inv.unit.id,
      unitNumber: inv.unit.unitNumber,
      property:   inv.unit.property ? { id: inv.unit.property.id, name: inv.unit.property.name } : undefined,
    } : undefined,
  };
}

const include = {
  customer: { select: { id: true, customerNo: true, name: true, phoneLocal: true, icPassport: true } },
  unit:     { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
};

// ─── GET / ────────────────────────────────────────────────────────────────────

router.get('/', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const { unitId, customerId, status } = req.query as Record<string, string>;
    const where: any = { isActive: true };
    if (unitId)     where.unitId     = unitId;
    if (customerId) where.customerId = customerId;
    if (status)     where.status     = status;

    const rows = await (prisma as any).investment.findMany({
      where,
      include,
      orderBy: { startDate: 'desc' },
    });
    res.json(rows.map(serialize));
  } catch (err) {
    console.error('List investments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const inv = await (prisma as any).investment.findFirst({
      where: { id: req.params.id, isActive: true },
      include,
    });
    if (!inv) { res.status(404).json({ error: 'Investment not found' }); return; }
    res.json(serialize(inv));
  } catch (err) {
    console.error('Get investment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / ───────────────────────────────────────────────────────────────────

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = investmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { customerId, unitId, capitalAmount, startDate, endDate, status, notes } = parsed.data;

  // Validate both FK targets exist
  const [customer, unit] = await Promise.all([
    (prisma.customer.findFirst as any)({ where: { id: customerId, isActive: true } }),
    (prisma.unit.findFirst as any)({ where: { id: unitId, isActive: true } }),
  ]);
  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }
  if (!unit)     { res.status(404).json({ error: 'Unit not found' }); return; }

  if (new Date(endDate) <= new Date(startDate)) {
    res.status(400).json({ error: 'End date must be after start date' });
    return;
  }

  try {
    const inv = await (prisma as any).investment.create({
      data: {
        customerId,
        unitId,
        capitalAmount,
        startDate: new Date(startDate),
        endDate:   new Date(endDate),
        status:    status ?? 'ACTIVE',
        notes:     notes ?? null,
      },
      include,
    });
    res.status(201).json(serialize(inv));
  } catch (err: any) {
    console.error('Create investment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const existing = await (prisma as any).investment.findFirst({ where: { id: req.params.id, isActive: true } });
  if (!existing) { res.status(404).json({ error: 'Investment not found' }); return; }

  const { capitalAmount, startDate, endDate, status, notes } = parsed.data;
  const resolvedStart = startDate ? new Date(startDate) : existing.startDate;
  const resolvedEnd   = endDate   ? new Date(endDate)   : existing.endDate;
  if (resolvedEnd <= resolvedStart) {
    res.status(400).json({ error: 'End date must be after start date' });
    return;
  }

  try {
    const inv = await (prisma as any).investment.update({
      where: { id: req.params.id },
      data: {
        ...(capitalAmount !== undefined && { capitalAmount }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate   !== undefined && { endDate:   new Date(endDate) }),
        ...(status    !== undefined && { status }),
        ...(notes     !== undefined && { notes }),
      },
      include,
    });
    res.json(serialize(inv));
  } catch (err) {
    console.error('Update investment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const existing = await (prisma as any).investment.findFirst({ where: { id: req.params.id, isActive: true } });
  if (!existing) { res.status(404).json({ error: 'Investment not found' }); return; }

  try {
    await (prisma as any).investment.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    });
    res.status(204).send();
  } catch (err) {
    console.error('Delete investment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
