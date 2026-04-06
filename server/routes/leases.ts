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
    promotionAmount: toNumber(lease.promotionAmount ?? 0),
    totalAmount: toNumber(lease.totalAmount),
    cleaningFee: toNumber(lease.cleaningFee ?? 0),
    deposit: lease.deposit
      ? {
          ...lease.deposit,
          amount: toNumber(lease.deposit.amount),
          receivedAmount: lease.deposit.receivedAmount != null ? toNumber(lease.deposit.receivedAmount) : null,
          refundedAmount: lease.deposit.refundedAmount != null ? toNumber(lease.deposit.refundedAmount) : null,
        }
      : null,
    invoices: lease.invoices?.map((inv: any) => ({
      ...inv,
      amount: toNumber(inv.amount),
      paidAmount: toNumber(inv.paidAmount),
    })),
  };
}

// ─── GET / — List all leases ───────────────────────────────────────────────

router.get('/', authenticate, requireViewer, async (_req: AuthRequest, res: Response) => {
  try {
    const leases: any[] = await (prisma.leaseAgreement.findMany as any)({
      include: {
        customer: { select: { id: true, name: true, phoneLocal: true, icPassport: true } },
        company:  { select: { id: true, name: true, phone: true } },
        unit:    { select: { id: true, unitNumber: true, property: { select: { name: true } } } },
        carpark: { select: { id: true, carparkNumber: true } },
        deposit: true,
        _count:  { select: { invoices: true } },
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
    const lease: any = await (prisma.leaseAgreement.findUnique as any)({
      where: { id: req.params.id },
      include: {
        customer: {
          select: {
            id: true, name: true, phoneLocal: true, icPassport: true,
            email: true, currentAddress: true,
          },
        },
        company: {
          select: {
            id: true, name: true, managerName: true, email: true,
            phone: true, tinNumber: true, address: true,
          },
        },
        unit:    { select: { id: true, unitNumber: true, property: { select: { name: true } } } },
        carpark: { select: { id: true, carparkNumber: true } },
        deposit: true,
        invoices: { orderBy: { periodStart: 'asc' } },
        _count:  { select: { invoices: true } },
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

// ─── PATCH /:id/terminate — Terminate a lease (optionally with early end date) ─

const terminateLeaseSchema = z.object({
  terminationDate: z.string().optional(), // ISO date string, must be within lease period
});

router.patch('/:id/terminate', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = terminateLeaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lease = await tx.leaseAgreement.findUnique({
        where: { id: req.params.id },
      });

      if (!lease) throw new Error('NOT_FOUND');
      if (lease.status !== 'ACTIVE' && lease.status !== 'UPCOMING') {
        throw new Error('INVALID_STATUS');
      }

      // Resolve termination date
      let terminationDate: Date | null = null;
      if (parsed.data.terminationDate) {
        terminationDate = new Date(parsed.data.terminationDate);
        if (isNaN(terminationDate.getTime())) throw new Error('INVALID_DATE');
        // Must be within the lease period (inclusive of start, inclusive of end)
        if (terminationDate < lease.startDate || terminationDate > lease.endDate) {
          throw new Error('DATE_OUT_OF_RANGE');
        }
      }

      // Update lease: set status and optionally shorten endDate
      const updated = await tx.leaseAgreement.update({
        where: { id: lease.id },
        data: {
          status: 'TERMINATED',
          ...(terminationDate ? { endDate: terminationDate } : {}),
        },
      });

      // Cancel PENDING invoices that start after the termination date (or all if no date given)
      const invoiceCancelWhere: any = {
        leaseId: lease.id,
        status: 'PENDING',
      };
      if (terminationDate) {
        // Keep invoices whose period has already started on or before the termination date
        invoiceCancelWhere.periodStart = { gt: terminationDate };
      }
      await tx.invoice.updateMany({
        where: invoiceCancelWhere,
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
    if (err.message === 'INVALID_DATE') {
      res.status(400).json({ error: 'Invalid termination date' });
      return;
    }
    if (err.message === 'DATE_OUT_OF_RANGE') {
      res.status(400).json({ error: 'Termination date must be within the lease period' });
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

// PATCH /api/invoices/:id/pay — Mark invoice as paid (full or partial)
const payInvoiceSchema = z.object({
  amount: z.number().positive(),
});

invoicesRouter.patch('/:id/pay', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = payInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'amount is required' });
    return;
  }

  try {
    const { Decimal } = await import('@prisma/client/runtime/library');
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } }) as any;
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') {
      res.status(400).json({ error: 'Only PENDING or OVERDUE invoices can receive payment' });
      return;
    }

    const newPaidAmount = Number(invoice.paidAmount ?? 0) + parsed.data.amount;
    const invoiceAmount = Number(invoice.amount);
    const isFullyPaid = newPaidAmount >= invoiceAmount;

    const updated = await (prisma.invoice.update as any)({
      where: { id: req.params.id },
      data: {
        paidAmount: new Decimal(Math.min(newPaidAmount, invoiceAmount)),
        ...(isFullyPaid ? { status: 'PAID', paidAt: new Date() } : {}),
      },
    });

    res.json({ ...updated, amount: toNumber(updated.amount), paidAmount: toNumber(updated.paidAmount) });
  } catch (err) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Deposits Router ─────────────────────────────────────────────────────

const depositsRouter = Router();

const updateDepositSchema = z.object({
  action: z.enum(['receive', 'refund', 'forfeit', 'editAmount']),
  amount: z.number().min(0),
});

// PATCH /api/deposits/:id — Update deposit with partial or full amount
depositsRouter.patch('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  const parsed = updateDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  try {
    const { Decimal } = await import('@prisma/client/runtime/library');
    const deposit = await prisma.leaseDeposit.findUnique({ where: { id: req.params.id } }) as any;
    if (!deposit) {
      res.status(404).json({ error: 'Deposit not found' });
      return;
    }

    const { action, amount } = parsed.data;
    const depositAmount = Number(deposit.amount);
    const data: any = {};

    if (action === 'receive') {
      if (deposit.status !== 'PENDING' && deposit.status !== 'PARTIALLY_HELD') {
        res.status(400).json({ error: 'Deposit is already fully received' });
        return;
      }
      const currentReceived = Number(deposit.receivedAmount ?? 0);
      const newReceived = Math.min(currentReceived + amount, depositAmount);
      data.receivedAmount = new Decimal(newReceived);
      if (newReceived >= depositAmount) {
        data.status = 'HELD';
        data.paidAt = new Date();
      } else {
        data.status = 'PARTIALLY_HELD';
      }
    } else if (action === 'refund') {
      if (deposit.status !== 'HELD' && deposit.status !== 'PARTIALLY_HELD' && deposit.status !== 'PARTIALLY_REFUNDED') {
        res.status(400).json({ error: 'Deposit cannot be refunded in its current state' });
        return;
      }
      const currentRefunded = Number(deposit.refundedAmount ?? 0);
      const newRefunded = Math.min(currentRefunded + amount, depositAmount);
      data.refundedAmount = new Decimal(newRefunded);
      if (newRefunded >= depositAmount) {
        data.status = 'REFUNDED';
        data.refundedAt = new Date();
      } else {
        data.status = 'PARTIALLY_REFUNDED';
      }
    } else if (action === 'forfeit') {
      if (deposit.status !== 'HELD' && deposit.status !== 'PARTIALLY_HELD') {
        res.status(400).json({ error: 'Only a received deposit can be forfeited' });
        return;
      }
      // amount = how much to give back (0 = full forfeit)
      data.status = 'FORFEITED';
      data.refundedAmount = new Decimal(amount);
      data.refundedAt = new Date();
    } else if (action === 'editAmount') {
      // Only allow editing deposit amount before it's been refunded or forfeited
      if (deposit.status === 'REFUNDED' || deposit.status === 'PARTIALLY_REFUNDED' || deposit.status === 'FORFEITED') {
        res.status(400).json({ error: 'Cannot edit deposit amount after refund or forfeit' });
        return;
      }
      if (amount <= 0) {
        res.status(400).json({ error: 'Deposit amount must be greater than 0' });
        return;
      }
      data.amount = new Decimal(amount);
      // If received amount exceeds new amount, cap it and adjust status
      const currentReceived = Number(deposit.receivedAmount ?? 0);
      if (currentReceived > 0 && currentReceived >= amount) {
        data.receivedAmount = new Decimal(amount);
        data.status = 'HELD';
        data.paidAt = deposit.paidAt || new Date();
      } else if (currentReceived > 0 && currentReceived < amount) {
        data.status = 'PARTIALLY_HELD';
      }
    }

    const updated = await prisma.leaseDeposit.update({ where: { id: req.params.id }, data }) as any;
    res.json({
      ...updated,
      amount: toNumber(updated.amount),
      receivedAmount: updated.receivedAmount != null ? toNumber(updated.receivedAmount) : null,
      refundedAmount: updated.refundedAmount != null ? toNumber(updated.refundedAmount) : null,
    });
  } catch (err) {
    console.error('Update deposit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
export { invoicesRouter, depositsRouter };
