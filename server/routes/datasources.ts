import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

const dataSourceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const db = prisma as any;

router.get('/', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const sources = await db.dataSource.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { customers: { where: { isActive: true } } } } },
    });
    res.json(sources.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      isActive: s.isActive,
      customerCount: s._count.customers,
    })));
  } catch (err) {
    console.error('List data sources error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = dataSourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const source = await db.dataSource.create({ data: parsed.data });
    res.status(201).json(source);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A data source with this name already exists' });
      return;
    }
    console.error('Create data source error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = dataSourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const source = await db.dataSource.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(source);
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Data source not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A data source with this name already exists' });
      return;
    }
    console.error('Update data source error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await db.dataSource.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Data source not found' });
      return;
    }
    console.error('Delete data source error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
