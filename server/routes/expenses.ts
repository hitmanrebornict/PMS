import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const expenseTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const expenseSchema = z.object({
  unitId: z.string().uuid(),
  expenseTypeId: z.string().uuid(),
  amount: z.number().min(0),
  description: z.string().max(1000).optional(),
  expenseDate: z.string().datetime({ offset: true }).or(z.string().date()),
});

// ─── Expense Types ────────────────────────────────────────────────────────────

router.get('/types', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const types: any[] = await (prisma.expenseType.findMany as any)({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: { where: { isActive: true } } } } },
    });
    res.json(types.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      isActive: t.isActive,
      expenseCount: t._count.expenses,
    })));
  } catch (err) {
    console.error('List expense types error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/types', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = expenseTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const type = await prisma.expenseType.create({ data: parsed.data });
    res.status(201).json(type);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Expense type name already exists' });
      return;
    }
    console.error('Create expense type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/types/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = expenseTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const type = await prisma.expenseType.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(type);
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Expense type not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Expense type name already exists' });
      return;
    }
    console.error('Update expense type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/types/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.expenseType.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Expense type not found' });
      return;
    }
    console.error('Delete expense type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

// GET /api/expenses — optionally filter by unitId or propertyId
router.get('/', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const { unitId, propertyId } = req.query as { unitId?: string; propertyId?: string };
  try {
    const expenses: any[] = await (prisma.expense.findMany as any)({
      where: {
        isActive: true,
        ...(unitId ? { unitId } : {}),
        ...(propertyId ? { unit: { propertyId } } : {}),
      },
      include: {
        expenseType: { select: { id: true, name: true } },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { expenseDate: 'desc' },
    });
    res.json(expenses.map(e => ({
      id: e.id,
      amount: Number(e.amount),
      description: e.description,
      expenseDate: e.expenseDate.toISOString().split('T')[0],
      expenseType: e.expenseType,
      unit: {
        id: e.unit.id,
        unitNumber: e.unit.unitNumber,
        property: e.unit.property,
      },
      createdAt: e.createdAt,
    })));
  } catch (err) {
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/expenses/summary — expenses grouped by property → unit
router.get('/summary', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const properties: any[] = await (prisma.masterProperty.findMany as any)({
      where: { isActive: true },
      include: {
        units: {
          where: { isActive: true },
          include: {
            expenses: {
              where: { isActive: true },
              include: { expenseType: { select: { id: true, name: true } } },
              orderBy: { expenseDate: 'desc' },
            },
          },
          orderBy: { unitNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = properties.map(p => ({
      id: p.id,
      name: p.name,
      address: p.address,
      totalExpenses: p.units.reduce(
        (sum, u) => sum + u.expenses.reduce((s, e) => s + Number(e.amount), 0),
        0,
      ),
      units: p.units.map(u => ({
        id: u.id,
        unitNumber: u.unitNumber,
        type: u.type,
        status: u.status,
        totalExpenses: u.expenses.reduce((s, e) => s + Number(e.amount), 0),
        expenses: u.expenses.map(e => ({
          id: e.id,
          amount: Number(e.amount),
          description: e.description,
          expenseDate: e.expenseDate.toISOString().split('T')[0],
          expenseType: e.expenseType,
        })),
      })),
    }));

    res.json(result);
  } catch (err) {
    console.error('Expense summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const expense = await prisma.expense.create({
      data: {
        unitId: parsed.data.unitId,
        expenseTypeId: parsed.data.expenseTypeId,
        amount: parsed.data.amount,
        description: parsed.data.description,
        expenseDate: new Date(parsed.data.expenseDate),
      },
      include: {
        expenseType: { select: { id: true, name: true } },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.status(201).json({
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      expenseDate: expense.expenseDate.toISOString().split('T')[0],
      expenseType: expense.expenseType,
      unit: {
        id: expense.unit.id,
        unitNumber: expense.unit.unitNumber,
        property: expense.unit.property,
      },
      createdAt: expense.createdAt,
    });
  } catch (err: any) {
    if (err.code === 'P2003') {
      res.status(409).json({ error: 'Unit or expense type not found' });
      return;
    }
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        unitId: parsed.data.unitId,
        expenseTypeId: parsed.data.expenseTypeId,
        amount: parsed.data.amount,
        description: parsed.data.description,
        expenseDate: new Date(parsed.data.expenseDate),
      },
      include: {
        expenseType: { select: { id: true, name: true } },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json({
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      expenseDate: expense.expenseDate.toISOString().split('T')[0],
      expenseType: expense.expenseType,
      unit: {
        id: expense.unit.id,
        unitNumber: expense.unit.unitNumber,
        property: expense.unit.property,
      },
      createdAt: expense.createdAt,
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.expense.update({ where: { id: req.params.id }, data: { isActive: false } as any });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
