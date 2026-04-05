import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phoneLocal: z.string().min(1).max(30),
  icPassport: z.string().min(1).max(50),
  currentAddress: z.string().min(1).max(500),
  phoneOther: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  wechatId: z.string().max(100).optional(),
  whatsappNumber: z.string().max(30).optional(),
  remark: z.string().max(1000).optional(),
  dataSourceId: z.string().uuid().optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const includeDataSource = { dataSource: { select: { id: true, name: true } } } as any;

// ─── CRUD ───────────────────────────────────────────────────────────────────

router.get('/', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const customers = await (prisma.customer.findMany as any)({
      orderBy: { customerNo: 'desc' },
      include: includeDataSource,
    });
    res.json(customers.map((c: any) => ({
      id: c.id,
      customerNo: c.customerNo,
      name: c.name,
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
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ error: 'Cannot delete customer with existing bookings or leases' });
      return;
    }
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
