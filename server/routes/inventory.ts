import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer } from '../middleware/authorize.js';

const router = Router();

// ─── GET /timeline ───────────────────────────────────────────────────────────

const timelineQuerySchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

router.get('/timeline', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const parsed = timelineQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ error: 'Invalid date format' });
    return;
  }

  try {
    // Fetch all properties with units
    const properties: any[] = await (prisma.masterProperty.findMany as any)({
      where: { isActive: true },
      include: {
        units: {
          where: { isActive: true },
          select: { id: true, unitNumber: true, type: true, status: true, suggestedRentalPrice: true },
          orderBy: { unitNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch all carparks (independent)
    const carparks: any[] = await (prisma.carpark.findMany as any)({
      where: { isActive: true },
      select: { id: true, carparkNumber: true, status: true, suggestedRentalPrice: true },
      orderBy: { carparkNumber: 'asc' },
    });

    // Fetch overlapping leases
    const leases = await prisma.leaseAgreement.findMany({
      where: {
        status: { in: ['ACTIVE', 'UPCOMING'] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      select: {
        id: true,
        unitId: true,
        carparkId: true,
        startDate: true,
        endDate: true,
        status: true,
        customer: { select: { id: true, name: true } },
      },
    });

    // Group leases by asset
    const unitLeases = new Map<string, typeof leases>();
    const carparkLeases = new Map<string, typeof leases>();

    for (const lease of leases) {
      if (lease.unitId) {
        const arr = unitLeases.get(lease.unitId) || [];
        arr.push(lease);
        unitLeases.set(lease.unitId, arr);
      }
      if (lease.carparkId) {
        const arr = carparkLeases.get(lease.carparkId) || [];
        arr.push(lease);
        carparkLeases.set(lease.carparkId, arr);
      }
    }

    const formatLeases = (assetLeases: typeof leases | undefined) =>
      (assetLeases || []).map((l) => ({
        id: l.id,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        status: l.status,
        customerName: l.customer.name,
      }));

    res.json({
      properties: properties.map((p) => ({
        id: p.id,
        name: p.name,
        units: p.units.map((u) => ({
          id: u.id,
          unitNumber: u.unitNumber,
          type: u.type,
          status: u.status,
          suggestedRentalPrice: Number(u.suggestedRentalPrice),
          leases: formatLeases(unitLeases.get(u.id)),
        })),
      })),
      carparks: carparks.map((c) => ({
        id: c.id,
        carparkNumber: c.carparkNumber,
        status: c.status,
        suggestedRentalPrice: Number(c.suggestedRentalPrice),
        leases: formatLeases(carparkLeases.get(c.id)),
      })),
    });
  } catch (err) {
    console.error('Timeline fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /customers/search ───────────────────────────────────────────────────

router.get('/customers/search', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q) {
    res.json([]);
    return;
  }

  try {
    const customers = await (prisma.customer.findMany as any)({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phoneLocal: { contains: q } },
          { icPassport: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phoneLocal: true,
        icPassport: true,
        email: true,
        currentAddress: true,
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (err) {
    console.error('Customer search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
