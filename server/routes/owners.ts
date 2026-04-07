import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

const ownerSchema = z.object({
  name:        z.string().min(1).max(200),
  phone:       z.string().max(50).optional(),
  email:       z.string().email().optional().or(z.literal('')),
  icPassport:  z.string().max(100).optional(),
  bankAccount: z.string().max(100).optional(),
  bankName:    z.string().max(200).optional(),
  address:     z.string().max(500).optional(),
  notes:       z.string().max(1000).optional(),
});

function serialize(o: any) {
  return {
    id:          o.id,
    name:        o.name,
    phone:       o.phone ?? null,
    email:       o.email ?? null,
    icPassport:  o.icPassport ?? null,
    bankAccount: o.bankAccount ?? null,
    bankName:    o.bankName ?? null,
    address:     o.address ?? null,
    notes:       o.notes ?? null,
    createdAt:   o.createdAt.toISOString(),
  };
}

router.get('/', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const owners = await (prisma as any).owner.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(owners.map(serialize));
  } catch (err) {
    console.error('List owners error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = ownerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
  try {
    const owner = await (prisma as any).owner.create({ data: parsed.data });
    res.status(201).json(serialize(owner));
  } catch (err) {
    console.error('Create owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = ownerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
  try {
    const owner = await (prisma as any).owner.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(serialize(owner));
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Owner not found' }); return; }
    console.error('Update owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma as any).owner.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') { res.status(404).json({ error: 'Owner not found' }); return; }
    console.error('Delete owner error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
