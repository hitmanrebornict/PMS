import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const customerBaseSchema = z.object({
  name: z.string().min(1).max(200),
  gender: z.enum(['MALE', 'FEMALE']).optional().nullable(),
  phoneLocal: z.string().max(30).optional(),
  phoneOther: z.string().max(30).optional(),
  icPassport: z.string().min(1).max(50),
  currentAddress: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal('')),
  wechatId: z.string().max(100).optional(),
  whatsappNumber: z.string().max(30).optional(),
  remark: z.string().max(1000).optional(),
  dataSourceId: z.string().uuid().optional().nullable(),
});

const atLeastOnePhone = (data: { phoneLocal?: string; phoneOther?: string }) =>
  (data.phoneLocal && data.phoneLocal.trim().length > 0) ||
  (data.phoneOther && data.phoneOther.trim().length > 0);

const createCustomerSchema = customerBaseSchema.refine(atLeastOnePhone, {
  message: 'At least one phone number (Local H/P or Overseas H/P) is required',
  path: ['phoneLocal'],
});

const updateCustomerSchema = customerBaseSchema.partial().refine(
  data => {
    // Only enforce if both phone fields are explicitly provided as empty
    const localGiven = data.phoneLocal !== undefined;
    const otherGiven = data.phoneOther !== undefined;
    if (localGiven && otherGiven) return atLeastOnePhone(data as any);
    return true;
  },
  { message: 'At least one phone number is required', path: ['phoneLocal'] }
);

const includeDataSource = { dataSource: { select: { id: true, name: true } } } as any;

// ─── CRUD ───────────────────────────────────────────────────────────────────

router.get('/', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const customers = await (prisma.customer.findMany as any)({
      where: { isActive: true },
      orderBy: { customerNo: 'desc' },
      include: includeDataSource,
    });
    res.json(customers.map((c: any) => ({
      id: c.id,
      customerNo: c.customerNo,
      name: c.name,
      gender: c.gender,
      phoneLocal: c.phoneLocal,
      phoneOther: c.phoneOther,
      icPassport: c.icPassport,
      email: c.email,
      currentAddress: c.currentAddress,
      wechatId: c.wechatId,
      whatsappNumber: c.whatsappNumber,
      remark: c.remark,
      dataSourceId: c.dataSourceId,
      dataSource: c.dataSource,
    })));
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const data = { ...parsed.data };
    if (data.email === '') delete data.email;
    const customer: any = await (prisma.customer.create as any)({ data, include: includeDataSource });
    res.status(201).json({
      id: customer.id,
      customerNo: customer.customerNo,
      name: customer.name,
      gender: customer.gender,
      phoneLocal: customer.phoneLocal,
      icPassport: customer.icPassport,
      email: customer.email,
      currentAddress: customer.currentAddress,
      dataSourceId: customer.dataSourceId,
      dataSource: customer.dataSource,
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A customer with this IC/Passport number already exists' });
      return;
    }
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const data = { ...parsed.data };
    if (data.email === '') delete data.email;
    const customer: any = await (prisma.customer.update as any)({
      where: { id: req.params.id },
      data,
      include: includeDataSource,
    });
    res.json({
      id: customer.id,
      customerNo: customer.customerNo,
      name: customer.name,
      gender: customer.gender,
      phoneLocal: customer.phoneLocal,
      phoneOther: customer.phoneOther,
      icPassport: customer.icPassport,
      email: customer.email,
      currentAddress: customer.currentAddress,
      wechatId: customer.wechatId,
      whatsappNumber: customer.whatsappNumber,
      remark: customer.remark,
      dataSourceId: customer.dataSourceId,
      dataSource: customer.dataSource,
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A customer with this IC/Passport number already exists' });
      return;
    }
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } as any });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
