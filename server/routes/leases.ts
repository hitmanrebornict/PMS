import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireViewer, requireManager } from '../middleware/authorize.js';

const router = Router();

// ─── Helper: convert Decimal fields to numbers ─────────────────────────────

function toNumber(val: any): number {
  return val != null ? Number(val) : 0;
}

function serializeLease(lease: any) {
  return {
    ...lease,
    unitPrice: toNumber(lease.unitPrice),
    totalAmount: toNumber(lease.totalAmount),
    deposit: lease.deposit
      ? { ...lease.deposit, amount: toNumber(lease.deposit.amount) }
      : null,
    invoices: lease.invoices?.map((inv: any) => ({
      ...inv,
      amount: toNumber(inv.amount),
    })),
  };
}

// ─── GET / — List all leases ───────────────────────────────────────────────

router.get('/', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const leases = await prisma.leaseAgreement.findMany({
      include: {
        customer: { select: { id: true, name: true, phoneLocal: true, icPassport: true } },
        unit: { select: { id: true, unitNumber: true, property: { select: { name: true } } } },
        carpark: { select: { id: true, carparkNumber: true } },
        deposit: true,
        _count: { select: { invoices: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(leases.map(serializeLease));
  } catch (err) {
    console.error('List leases error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id — Single lease with full details ────────────────────────────

router.get('/:id', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const lease = await prisma.leaseAgreement.findUnique({
      where: { id: req.params.id },
      include: {
        customer: {
          select: {
            id: true, name: true, phoneLocal: true, icPassport: true,
            email: true, currentAddress: true,
          },
        },
        unit: { select: { id: true, unitNumber: true, property: { select: { name: true } } } },
        carpark: { select: { id: true, carparkNumber: true } },
        deposit: true,
        invoices: { orderBy: { periodStart: 'asc' } },
        _count: { select: { invoices: true } },
      },
    });

    if (!lease) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }

    res.json(serializeLease(lease));
  } catch (err) {
    console.error('Get lease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/terminate — Terminate a lease ─────────────────────────────

router.patch('/:id/terminate', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lease = await tx.leaseAgreement.findUnique({
        where: { id: req.params.id },
        include: { deposit: true },
      });

      if (!lease) throw new Error('NOT_FOUND');
      if (lease.status !== 'ACTIVE' && lease.status !== 'UPCOMING') {
        throw new Error('INVALID_STATUS');
      }

      // Update lease status
      const updated = await tx.leaseAgreement.update({
        where: { id: lease.id },
        data: { status: 'TERMINATED' },
      });

      // Cancel all PENDING invoices
      await tx.invoice.updateMany({
        where: { leaseId: lease.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      // Set asset back to VACANT
      if (lease.unitId) {
        await tx.unit.update({ where: { id: lease.unitId }, data: { status: 'VACANT' } });
      }
      if (lease.carparkId) {
        await tx.carpark.update({ where: { id: lease.carparkId }, data: { status: 'VACANT' } });
      }

      return updated;
    });

    res.json(result);
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    if (err.message === 'INVALID_STATUS') {
      res.status(400).json({ error: 'Only ACTIVE or UPCOMING leases can be terminated' });
      return;
    }
    console.error('Terminate lease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/complete — Complete a lease ───────────────────────────────

router.patch('/:id/complete', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lease = await tx.leaseAgreement.findUnique({
        where: { id: req.params.id },
      });

      if (!lease) throw new Error('NOT_FOUND');
      if (lease.status !== 'ACTIVE') {
        throw new Error('INVALID_STATUS');
      }

      const updated = await tx.leaseAgreement.update({
        where: { id: lease.id },
        data: { status: 'COMPLETED' },
      });

      // Set asset back to VACANT
      if (lease.unitId) {
        await tx.unit.update({ where: { id: lease.unitId }, data: { status: 'VACANT' } });
      }
      if (lease.carparkId) {
        await tx.carpark.update({ where: { id: lease.carparkId }, data: { status: 'VACANT' } });
      }

      return updated;
    });

    res.json(result);
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    if (err.message === 'INVALID_STATUS') {
      res.status(400).json({ error: 'Only ACTIVE leases can be completed' });
      return;
    }
    console.error('Complete lease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id — Update editable lease fields ────────────────────────────

const updateLeaseSchema = z.object({
  unitPrice: z.number().positive().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

router.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = updateLeaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const lease = await prisma.leaseAgreement.findUnique({ where: { id: req.params.id } });
    if (!lease) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    if (lease.status !== 'ACTIVE' && lease.status !== 'UPCOMING') {
      res.status(400).json({ error: 'Only ACTIVE or UPCOMING leases can be edited' });
      return;
    }

    const data: any = {};
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.unitPrice !== undefined) {
      const { Decimal } = await import('@prisma/client/runtime/library');
      data.unitPrice = new Decimal(parsed.data.unitPrice);
    }
    if (parsed.data.endDate !== undefined) {
      const endDate = new Date(parsed.data.endDate);
      if (isNaN(endDate.getTime())) {
        res.status(400).json({ error: 'Invalid end date' });
        return;
      }
      if (endDate <= lease.startDate) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
      }
      data.endDate = endDate;
    }

    const updated = await prisma.leaseAgreement.update({ where: { id: req.params.id }, data });
    res.json(serializeLease(updated));
  } catch (err) {
    console.error('Update lease error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /:id/invoices — Add a new invoice to a lease ───────────────────

const addInvoiceSchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().min(1),
});

router.post('/:id/invoices', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = addInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const lease = await prisma.leaseAgreement.findUnique({ where: { id: req.params.id } });
    if (!lease) {
      res.status(404).json({ error: 'Lease not found' });
      return;
    }
    if (lease.status !== 'ACTIVE' && lease.status !== 'UPCOMING') {
      res.status(400).json({ error: 'Cannot add invoices to a terminated or completed lease' });
      return;
    }

    const { Decimal } = await import('@prisma/client/runtime/library');
    const invoice = await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        periodStart: new Date(parsed.data.periodStart),
        periodEnd: new Date(parsed.data.periodEnd),
        amount: new Decimal(parsed.data.amount),
        dueDate: new Date(parsed.data.dueDate),
        status: 'PENDING',
      },
    });

    res.status(201).json({ ...invoice, amount: Number(invoice.amount) });
  } catch (err) {
    console.error('Add invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /:id/invoices — List invoices for a lease ────────────────────────

router.get('/:id/invoices', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { leaseId: req.params.id },
      orderBy: { periodStart: 'asc' },
    });

    res.json(invoices.map((inv) => ({ ...inv, amount: toNumber(inv.amount) })));
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Invoices Router ──────────────────────────────────────────────────────

const invoicesRouter = Router();

// PATCH /api/invoices/:id — Edit invoice amount/dueDate
const editInvoiceSchema = z.object({
  amount: z.number().positive().optional(),
  dueDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

invoicesRouter.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = editInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot edit a PAID or CANCELLED invoice' });
      return;
    }

    const data: any = {};
    if (parsed.data.amount !== undefined) {
      const { Decimal } = await import('@prisma/client/runtime/library');
      data.amount = new Decimal(parsed.data.amount);
    }
    if (parsed.data.dueDate) data.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.periodStart) data.periodStart = new Date(parsed.data.periodStart);
    if (parsed.data.periodEnd) data.periodEnd = new Date(parsed.data.periodEnd);

    const updated = await prisma.invoice.update({ where: { id: req.params.id }, data });
    res.json({ ...updated, amount: toNumber(updated.amount) });
  } catch (err) {
    console.error('Edit invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/invoices/:id/pay — Mark invoice as PAID
invoicesRouter.patch('/:id/pay', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') {
      res.status(400).json({ error: 'Only PENDING or OVERDUE invoices can be marked as paid' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    res.json({ ...updated, amount: toNumber(updated.amount) });
  } catch (err) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Deposits Router ─────────────────────────────────────────────────────

const depositsRouter = Router();

const updateDepositSchema = z.object({
  status: z.enum(['HELD', 'REFUNDED', 'FORFEITED']),
});

// PATCH /api/deposits/:id — Update deposit status
depositsRouter.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = updateDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const deposit = await prisma.leaseDeposit.findUnique({ where: { id: req.params.id } });
    if (!deposit) {
      res.status(404).json({ error: 'Deposit not found' });
      return;
    }

    const data: any = { status: parsed.data.status };
    if (parsed.data.status === 'HELD') {
      data.paidAt = new Date();
    } else if (parsed.data.status === 'REFUNDED') {
      data.refundedAt = new Date();
    }

    const updated = await prisma.leaseDeposit.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ ...updated, amount: toNumber(updated.amount) });
  } catch (err) {
    console.error('Update deposit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
export { invoicesRouter, depositsRouter };
