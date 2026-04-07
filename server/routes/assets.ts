import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const createPropertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
});

const createUnitSchema = z.object({
  propertyId: z.string().uuid(),
  unitNumber: z.string().min(1).max(50),
  type: z.enum(['STUDIO', 'ONE_BEDROOM', 'TWO_BEDROOM', 'THREE_BEDROOM', 'BUNGALOW', 'OTHER']),
  suggestedRentalPrice: z.number().min(0),
  status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE']).default('VACANT'),
});

const createCarparkSchema = z.object({
  carparkNumber: z.string().min(1).max(50),
  unitNo: z.string().max(50).optional(),
  suggestedRentalPrice: z.number().min(0),
  status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE']).default('VACANT'),
});

// ─── Master Properties ──────────────────────────────────────────────────────

router.get('/properties', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const properties: any[] = await (prisma.masterProperty.findMany as any)({
      where: { isActive: true },
      include: { _count: { select: { units: { where: { isActive: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json(properties.map(p => ({
      id: p.id,
      name: p.name,
      address: p.address,
      unitCount: p._count.units,
    })));
  } catch (err) {
    console.error('List properties error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/properties', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createPropertySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const property = await prisma.masterProperty.create({ data: parsed.data });
    res.status(201).json({ id: property.id, name: property.name, address: property.address });
  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/properties/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createPropertySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const property = await prisma.masterProperty.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json({ id: property.id, name: property.name, address: property.address });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    console.error('Update property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/properties/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    // Soft-delete the property and all its units
    await prisma.$transaction([
      (prisma.unit.updateMany as any)({
        where: { propertyId: req.params.id },
        data: { isActive: false },
      }),
      (prisma.masterProperty.update as any)({
        where: { id: req.params.id },
        data: { isActive: false },
      }),
    ]);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Units ──────────────────────────────────────────────────────────────────

router.get('/units', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const units: any[] = await (prisma.unit.findMany as any)({
      where: { isActive: true },
      include: { property: { select: { name: true } } },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    });
    res.json(units.map(u => ({
      id: u.id,
      propertyId: u.propertyId,
      propertyName: u.property.name,
      unitNumber: u.unitNumber,
      type: u.type,
      suggestedRentalPrice: Number(u.suggestedRentalPrice),
      status: u.status,
    })));
  } catch (err) {
    console.error('List units error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/units', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createUnitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const unit = await prisma.unit.create({ data: parsed.data });
    res.status(201).json({
      id: unit.id,
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      type: unit.type,
      suggestedRentalPrice: Number(unit.suggestedRentalPrice),
      status: unit.status,
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Unit number already exists in this property' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Property not found' });
      return;
    }
    console.error('Create unit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/units/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createUnitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const unit = await prisma.unit.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json({
      id: unit.id,
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      type: unit.type,
      suggestedRentalPrice: Number(unit.suggestedRentalPrice),
      status: unit.status,
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Unit number already exists in this property' });
      return;
    }
    console.error('Update unit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/units/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma.unit.update as any)({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }
    console.error('Delete unit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Carparks ───────────────────────────────────────────────────────────────

router.get('/carparks', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const carparks: any[] = await (prisma.carpark.findMany as any)({
      where: { isActive: true },
      orderBy: { carparkNumber: 'asc' },
    });
    res.json(carparks.map(c => ({
      id: c.id,
      carparkNumber: c.carparkNumber,
      unitNo: c.unitNo ?? null,
      suggestedRentalPrice: Number(c.suggestedRentalPrice),
      status: c.status,
    })));
  } catch (err) {
    console.error('List carparks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/carparks', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createCarparkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const carpark: any = await (prisma.carpark.create as any)({ data: parsed.data });
    res.status(201).json({
      id: carpark.id,
      carparkNumber: carpark.carparkNumber,
      unitNo: carpark.unitNo ?? null,
      suggestedRentalPrice: Number(carpark.suggestedRentalPrice),
      status: carpark.status,
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Carpark number already exists' });
      return;
    }
    console.error('Create carpark error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/carparks/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createCarparkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const carpark: any = await (prisma.carpark.update as any)({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json({
      id: carpark.id,
      carparkNumber: carpark.carparkNumber,
      unitNo: carpark.unitNo ?? null,
      suggestedRentalPrice: Number(carpark.suggestedRentalPrice),
      status: carpark.status,
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Carpark not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Carpark number already exists' });
      return;
    }
    console.error('Update carpark error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/carparks/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma.carpark.update as any)({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Carpark not found' });
      return;
    }
    console.error('Delete carpark error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
