import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const companyBaseSchema = z.object({
  name:           z.string().min(1).max(200),
  managerName:    z.string().max(200).optional(),
  email:          z.string().email().optional().or(z.literal('')),
  phone:          z.string().max(30).optional(),
  tinNumber:      z.string().max(50).optional(),
  address:        z.string().max(500).optional(),
  wechatId:       z.string().max(100).optional(),
  whatsappNumber: z.string().max(30).optional(),
  dataSourceId:   z.string().uuid().optional().nullable(),
  remark:         z.string().max(1000).optional(),
});

const updateCompanySchema = companyBaseSchema.partial();

const includeDataSource = { dataSource: { select: { id: true, name: true } } } as any;

// ─── GET / ───────────────────────────────────────────────────────────────────

router.get('/', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const companies: any[] = await (prisma as any).company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: includeDataSource,
    });
    res.json(companies.map((c: any) => ({
      id: c.id,
      name: c.name,
      managerName: c.managerName,
      email: c.email,
      phone: c.phone,
      tinNumber: c.tinNumber,
      address: c.address,
      wechatId: c.wechatId,
      whatsappNumber: c.whatsappNumber,
      remark: c.remark,
      dataSourceId: c.dataSourceId,
      dataSource: c.dataSource,
    })));
  } catch (err) {
    console.error('List companies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST / ──────────────────────────────────────────────────────────────────

router.post('/', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = companyBaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const data: any = { ...parsed.data };
    if (data.email === '') delete data.email;
    const company: any = await (prisma as any).company.create({ data, include: includeDataSource });
    res.status(201).json({
      id: company.id,
      name: company.name,
      managerName: company.managerName,
      email: company.email,
      phone: company.phone,
      tinNumber: company.tinNumber,
      address: company.address,
      wechatId: company.wechatId,
      whatsappNumber: company.whatsappNumber,
      remark: company.remark,
      dataSourceId: company.dataSourceId,
      dataSource: company.dataSource,
    });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /:id ────────────────────────────────────────────────────────────────

router.put('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = updateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const data: any = { ...parsed.data };
    if (data.email === '') data.email = null;
    const company: any = await (prisma as any).company.update({
      where: { id: req.params.id },
      data,
      include: includeDataSource,
    });
    res.json({
      id: company.id,
      name: company.name,
      managerName: company.managerName,
      email: company.email,
      phone: company.phone,
      tinNumber: company.tinNumber,
      address: company.address,
      wechatId: company.wechatId,
      whatsappNumber: company.whatsappNumber,
      remark: company.remark,
      dataSourceId: company.dataSourceId,
      dataSource: company.dataSource,
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id (soft delete) ───────────────────────────────────────────────

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma as any).company.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    console.error('Delete company error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /search ─────────────────────────────────────────────────────────────

router.get('/search', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (q.length < 1) { res.json([]); return; }
  try {
    const companies: any[] = await (prisma as any).company.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { managerName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
    res.json(companies.map((c: any) => ({
      id: c.id,
      name: c.name,
      managerName: c.managerName,
      phone: c.phone,
      email: c.email,
    })));
  } catch (err) {
    console.error('Search companies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
