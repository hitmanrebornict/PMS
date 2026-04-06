import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireManager } from '../middleware/authorize.js';
import { createLease } from '../services/lease.service.js';

const router = Router();

// ─── POST / (Create Lease) ───────────────────────────────────────────────────

const createLeaseSchema = z.object({
  renterType: z.enum(['customer', 'company']).default('customer'),

  // Individual renter
  customer: z.object({
    icPassport:     z.string().min(1),
    name:           z.string().min(1),
    phoneLocal:     z.string().min(1),
    email:          z.string().email().optional(),
    currentAddress: z.string().optional(),
  }).optional(),

  // Company renter — existing or new
  companyId: z.string().uuid().optional().nullable(),
  company: z.object({
    name:           z.string().min(1),
    managerName:    z.string().optional(),
    email:          z.string().email().optional().or(z.literal('')),
    phone:          z.string().optional(),
    tinNumber:      z.string().optional(),
    address:        z.string().optional(),
    wechatId:       z.string().optional(),
    whatsappNumber: z.string().optional(),
    dataSourceId:   z.string().uuid().optional().nullable(),
    remark:         z.string().optional(),
  }).optional(),

  // Asset
  unitId:    z.string().uuid().nullable().default(null),
  carparkId: z.string().uuid().nullable().default(null),

  // Lease terms
  startDate:       z.string().min(1),
  endDate:         z.string().min(1),
  billingCycle:    z.enum(['DAILY', 'FIXED_TERM', 'MONTHLY']),
  unitPrice:       z.number().positive(),
  promotionAmount: z.number().min(0).default(0),
  depositAmount:   z.number().min(0),
  cleaningFee:     z.number().min(0).default(0),
  notes:           z.string().optional(),
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

  if (data.renterType === 'customer' && !data.customer) {
    res.status(400).json({ error: 'Customer details are required for individual lease' });
    return;
  }

  if (data.renterType === 'company' && !data.companyId && !data.company) {
    res.status(400).json({ error: 'Company details or existing companyId are required for company lease' });
    return;
  }

  const startDate = new Date(data.startDate);
  const endDate   = new Date(data.endDate);

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
      renterType:      data.renterType,
      customer:        data.customer,
      companyId:       data.companyId ?? null,
      company:         data.company,
      unitId:          data.unitId,
      carparkId:       data.carparkId,
      startDate,
      endDate,
      billingCycle:    data.billingCycle,
      unitPrice:       data.unitPrice,
      promotionAmount: data.promotionAmount,
      depositAmount:   data.depositAmount,
      cleaningFee:     data.cleaningFee,
      notes:           data.notes,
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
