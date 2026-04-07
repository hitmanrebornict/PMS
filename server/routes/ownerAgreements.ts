import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';
import { generateOwnerExpenses, voidFutureExpenses } from '../services/ownerAgreement.service.js';

const router = Router();

const agreementSchema = z.object({
  ownerId:    z.string().uuid(),
  unitId:     z.string().uuid(),
  amount:     z.number().positive(),
  startDate:  z.string().datetime({ offset: true }).or(z.string().date()),
  endDate:    z.string().datetime({ offset: true }).or(z.string().date()),
  paymentDay: z.number().int().min(1).max(31).default(7),
  notes:      z.string().max(1000).optional(),
});

const terminateSchema = z.object({
  terminationDate: z.string().datetime({ offset: true }).or(z.string().date()),
});

const expenseInclude = {
  select: {
    id: true, dueDate: true, status: true, paidAt: true, amount: true, description: true, isActive: true,
  },
};

function serializeAgreement(a: any) {
  return {
    id:         a.id,
    ownerId:    a.ownerId,
    unitId:     a.unitId,
    amount:     Number(a.amount),
    startDate:  a.startDate.toISOString(),
    endDate:    a.endDate.toISOString(),
    paymentDay: a.paymentDay,
    notes:      a.notes ?? null,
    status:     a.status,
    createdAt:  a.createdAt.toISOString(),
    owner: a.owner ? { id: a.owner.id, name: a.owner.name, phone: a.owner.phone ?? null } : undefined,
    unit:  a.unit  ? {
      id:         a.unit.id,
      unitNumber: a.unit.unitNumber,
      property:   a.unit.property ? { id: a.unit.property.id, name: a.unit.property.name } : undefined,
    } : undefined,
    expenses: a.expenses
      ? a.expenses
          .filter((e: any) => e.isActive)
          .map((e: any) => ({
            id:          e.id,
            dueDate:     e.dueDate?.toISOString() ?? null,
            status:      e.status,
            paidAt:      e.paidAt?.toISOString() ?? null,
            amount:      Number(e.amount),
            description: e.description ?? null,
          }))
          .sort((a: any, b: any) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      : undefined,
  };
}

const include = {
  owner:    { select: { id: true, name: true, phone: true } },
  unit:     { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
  expenses: expenseInclude,
};

// ─── GET / ────────────────────────────────────────────────────────────────────

router.get('/', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const { unitId, ownerId } = req.query as Record<string, string>;
    const where: any = { isActive: true };
    if (unitId)  where.unitId  = unitId;
    if (ownerId) where.ownerId = ownerId;

    const rows = await (prisma as any).ownerAgreement.findMany({ where, include, orderBy: { startDate: 'desc' } });
    res.json(rows.map(serializeAgreement));
  } catch (err) {
    console.error('List owner agreements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const row = await (prisma as any).ownerAgreement.findFirst({ where: { id: req.params.id, isActive: true }, include });
    if (!row) { res.status(404).json({ error: 'Agreement not found' }); return; }
    res.json(serializeAgreement(row));
  } catch (err) {
    console.error('Get owner agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / ───────────────────────────────────────────────────────────────────

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = agreementSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  const { ownerId, unitId, amount, startDate, endDate, paymentDay, notes } = parsed.data;
  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (end <= start) { res.status(400).json({ error: 'End date must be after start date' }); return; }

  const [owner, unit] = await Promise.all([
    (prisma as any).owner.findFirst({ where: { id: ownerId, isActive: true } }),
    (prisma.unit.findFirst as any)({ where: { id: unitId, isActive: true } }),
  ]);
  if (!owner) { res.status(404).json({ error: 'Owner not found' }); return; }
  if (!unit)  { res.status(404).json({ error: 'Unit not found' }); return; }

  try {
    const agreement = await prisma.$transaction(async (tx: any) => {
      const ag = await tx.ownerAgreement.create({
        data: { ownerId, unitId, amount, startDate: start, endDate: end, paymentDay, notes: notes ?? null },
        include,
      });
      await generateOwnerExpenses(tx, ag);
      // Re-fetch with generated expenses
      return tx.ownerAgreement.findFirst({ where: { id: ag.id }, include });
    });
    res.status(201).json(serializeAgreement(agreement));
  } catch (err) {
    console.error('Create owner agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = agreementSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  const existing = await (prisma as any).ownerAgreement.findFirst({ where: { id: req.params.id, isActive: true } });
  if (!existing) { res.status(404).json({ error: 'Agreement not found' }); return; }
  if (existing.status !== 'ACTIVE') { res.status(409).json({ error: 'Only ACTIVE agreements can be edited' }); return; }

  const { amount, startDate, endDate, paymentDay, notes } = parsed.data;
  const resolvedStart = startDate ? new Date(startDate) : existing.startDate;
  const resolvedEnd   = endDate   ? new Date(endDate)   : existing.endDate;
  if (resolvedEnd <= resolvedStart) { res.status(400).json({ error: 'End date must be after start date' }); return; }

  try {
    const updated = await (prisma as any).ownerAgreement.update({
      where: { id: req.params.id },
      data: {
        ...(amount     !== undefined && { amount }),
        ...(startDate  !== undefined && { startDate: new Date(startDate) }),
        ...(endDate    !== undefined && { endDate:   new Date(endDate) }),
        ...(paymentDay !== undefined && { paymentDay }),
        ...(notes      !== undefined && { notes }),
      },
      include,
    });
    res.json(serializeAgreement(updated));
  } catch (err) {
    console.error('Update owner agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/terminate ─────────────────────────────────────────────────────

router.patch('/:id/terminate', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = terminateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  const existing = await (prisma as any).ownerAgreement.findFirst({ where: { id: req.params.id, isActive: true } });
  if (!existing) { res.status(404).json({ error: 'Agreement not found' }); return; }
  if (existing.status !== 'ACTIVE') { res.status(409).json({ error: 'Agreement is not active' }); return; }

  const termDate = new Date(parsed.data.terminationDate);
  if (termDate < existing.startDate) {
    res.status(400).json({ error: 'Termination date cannot be before start date' }); return;
  }

  try {
    const updated = await prisma.$transaction(async (tx: any) => {
      await voidFutureExpenses(tx, req.params.id, termDate);
      return tx.ownerAgreement.update({
        where: { id: req.params.id },
        data:  { status: 'TERMINATED', endDate: termDate },
        include,
      });
    });
    res.json(serializeAgreement(updated));
  } catch (err) {
    console.error('Terminate owner agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const existing = await (prisma as any).ownerAgreement.findFirst({ where: { id: req.params.id, isActive: true } });
  if (!existing) { res.status(404).json({ error: 'Agreement not found' }); return; }

  try {
    await prisma.$transaction(async (tx: any) => {
      // Void all pending expenses first
      await voidFutureExpenses(tx, req.params.id, new Date(0));
      await tx.ownerAgreement.update({ where: { id: req.params.id }, data: { isActive: false } });
    });
    res.status(204).send();
  } catch (err) {
    console.error('Delete owner agreement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
