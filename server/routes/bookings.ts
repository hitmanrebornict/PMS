import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireManager } from '../middleware/authorize.js';
import { createLease } from '../services/lease.service.js';

const router = Router();

// ─── POST / (Create Lease) ───────────────────────────────────────────────────

const createLeaseSchema = z.object({
  customer: z.object({
    icPassport: z.string().min(1),
    name: z.string().min(1),
    phoneLocal: z.string().min(1),
    email: z.string().email().optional(),
    currentAddress: z.string().optional(),
  }),
  unitId: z.string().uuid().nullable().default(null),
  carparkId: z.string().uuid().nullable().default(null),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  billingCycle: z.enum(['DAILY', 'FIXED_TERM', 'MONTHLY']),
  unitPrice: z.number().positive(),
  depositAmount: z.number().min(0),
  notes: z.string().optional(),
});

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createLeaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  if (!data.unitId && !data.carparkId) {
    res.status(400).json({ error: 'Either unitId or carparkId must be provided' });
    return;
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ error: 'Invalid date format' });
    return;
  }

  if (endDate <= startDate) {
    res.status(400).json({ error: 'End date must be after start date' });
    return;
  }

  try {
    const result = await createLease({
      customer: data.customer,
      unitId: data.unitId,
      carparkId: data.carparkId,
      startDate,
      endDate,
      billingCycle: data.billingCycle,
      unitPrice: data.unitPrice,
      depositAmount: data.depositAmount,
      notes: data.notes,
    });

    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'CONFLICT') {
      res.status(409).json({ error: 'An active or upcoming lease already exists for this asset in the selected date range' });
      return;
    }
    console.error('Create lease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
