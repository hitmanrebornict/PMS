import { Router, Response } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
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
        customer: { select: { id: true, name: true, phoneLocal: true, icPassport: true, whatsappNumber: true } },
        company:  { select: { id: true, name: true, phone: true, whatsappNumber: true } },
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
            email: true, currentAddress: true, whatsappNumber: true,
          },
        },
        company: {
          select: {
            id: true, name: true, managerName: true, email: true,
            phone: true, tinNumber: true, address: true, whatsappNumber: true,
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

// ─── GET /:id/files — List documents attached to a lease ─────────────────

router.get('/:id/files', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const files = await (prisma.file.findMany as any)({
      where: { leaseId: req.params.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        category: true,
        createdAt: true,
        uploadedBy: { select: { name: true } },
      },
    });
    res.json(files);
  } catch (err) {
    console.error('List lease files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id/files/:fileId — Remove a document from a lease ──────────

router.delete('/:id/files/:fileId', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    const file = await (prisma.file.findFirst as any)({
      where: { id: req.params.fileId, leaseId: req.params.id },
    });
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const { default: fs } = await import('fs');
    const { default: path } = await import('path');
    const folder = file.mimeType.startsWith('image/') ? 'photos' : 'documents';
    const filePath = path.join(process.cwd(), 'uploads', folder, file.storedName);
    fs.unlink(filePath, () => {});

    await prisma.file.delete({ where: { id: req.params.fileId } });
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('Delete lease file error:', err);
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
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']).optional(),
  referenceNo: z.string().max(100).optional(),
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
        ...(parsed.data.paymentMethod ? { paymentMethod: parsed.data.paymentMethod } : {}),
        ...(parsed.data.referenceNo   ? { referenceNo:   parsed.data.referenceNo   } : {}),
        ...(isFullyPaid ? { status: 'PAID', paidAt: new Date() } : {}),
      },
    });

    res.json({ ...updated, amount: toNumber(updated.amount), paidAmount: toNumber(updated.paidAmount) });
  } catch (err) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/invoices/:id/pdf — Stream invoice PDF ─────────────────────

invoicesRouter.get('/:id/pdf', authenticate, requireViewer, async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await (prisma.invoice.findUnique as any)({
      where: { id: req.params.id },
      include: {
        lease: {
          include: {
            customer: { select: { name: true, icPassport: true, currentAddress: true, phoneLocal: true, gender: true } },
            company:  { select: { name: true, managerName: true, phone: true, address: true } },
            unit:     { select: { unitNumber: true, property: { select: { name: true, address: true } } } },
            carpark:  { select: { carparkNumber: true } },
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const lease = invoice.lease;
    const tenantName = lease.customer?.name ?? lease.company?.name ?? 'Unknown';
    const tenantContact = lease.customer?.phoneLocal ?? lease.company?.phone ?? '';
    const tenantId = lease.customer?.icPassport ?? (lease.company?.managerName ? `Manager: ${lease.company.managerName}` : '');
    const tenantAddress = lease.customer?.currentAddress ?? lease.company?.address ?? '';
    const assetLabel = lease.unit
      ? `Unit ${lease.unit.unitNumber} — ${lease.unit.property.name}`
      : `Carpark ${lease.carpark?.carparkNumber ?? ''}`;
    const propertyAddress = lease.unit?.property?.address ?? '';

    const amount = Number(invoice.amount);
    const promotionAmount = Number(lease.promotionAmount ?? 0);
    const subtotal = amount + promotionAmount; // effective amount stored; gross = effective + promotion
    const total = amount;

    const formatDate = (d: Date | null | undefined) =>
      d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
    const formatRM = (n: number) => `RM ${n.toFixed(2)}`;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.id.slice(0, 8)}.pdf"`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(22).font('Helvetica-Bold').text('VersaHome', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text('Property Management', 50, 76)
      .text('(202601004828 (1666926-V))', 50, 89)
      .text('D1-47-05, Razak City Residences 1', 50, 102)
      .text('Jalan Razak Mansion, Sg. Besi', 50, 115)
      .text('57100 Kuala Lumpur', 50, 128);
    doc.fillColor('#000000');

    doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', 350, 50, { align: 'right', width: 195 });
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`# ${invoice.id.slice(0, 8).toUpperCase()}`, 350, 74, { align: 'right', width: 195 });
    doc.fillColor('#000000');

    doc.moveTo(50, 148).lineTo(545, 148).strokeColor('#cccccc').stroke();

    // ── Tenant details ───────────────────────────────────────────────────────
    doc.y = 163;
    doc.fontSize(9).font('Helvetica-Bold').text('BILL TO', 50);
    doc.font('Helvetica').fontSize(11).text(tenantName, 50, doc.y + 4);
    if (tenantId)      doc.fontSize(9).fillColor('#555555').text(tenantId);
    if (tenantAddress) doc.text(tenantAddress);
    if (tenantContact) doc.text(tenantContact);
    doc.fillColor('#000000');

    // ── Asset + Period (right column) ────────────────────────────────────────
    const col2x = 350;
    doc.fontSize(9).font('Helvetica-Bold').text('PROPERTY', col2x, 163, { width: 195 });
    doc.font('Helvetica').fontSize(10).text(assetLabel, col2x, 177, { width: 195 });
    if (propertyAddress) doc.fontSize(9).fillColor('#555555').text(propertyAddress, col2x, doc.y, { width: 195 });
    doc.fillColor('#000000');

    let rightY = doc.y + 10;
    doc.fontSize(9).font('Helvetica-Bold').text('BILLING PERIOD', col2x, rightY, { width: 195 });
    doc.font('Helvetica').fontSize(10)
      .text(`${formatDate(invoice.periodStart)} — ${formatDate(invoice.periodEnd)}`, col2x, rightY + 12, { width: 195 });
    rightY = doc.y + 10;
    doc.fontSize(9).font('Helvetica-Bold').text('DUE DATE', col2x, rightY, { width: 195 });
    doc.font('Helvetica').fontSize(10).text(formatDate(invoice.dueDate), col2x, rightY + 12, { width: 195 });

    // ── Amount table ─────────────────────────────────────────────────────────
    const tableY = 330;
    doc.moveTo(50, tableY).lineTo(545, tableY).strokeColor('#cccccc').stroke();

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555555');
    doc.text('DESCRIPTION', 50, tableY + 8, { width: 300 });
    doc.text('AMOUNT', 350, tableY + 8, { width: 195, align: 'right' });
    doc.fillColor('#000000');
    doc.moveTo(50, tableY + 22).lineTo(545, tableY + 22).strokeColor('#eeeeee').stroke();

    // Subtotal row
    doc.fontSize(10).font('Helvetica').text('Rental — ' + assetLabel, 50, tableY + 30, { width: 300 });
    doc.text(formatRM(subtotal), 350, tableY + 30, { width: 195, align: 'right' });

    // Promotion row (if applicable)
    let nextRowY = tableY + 52;
    if (promotionAmount > 0) {
      doc.fillColor('#c0392b').fontSize(10).font('Helvetica')
        .text('Promotion', 50, nextRowY, { width: 300 });
      doc.text(`− ${formatRM(promotionAmount)}`, 350, nextRowY, { width: 195, align: 'right' });
      doc.fillColor('#000000');
      nextRowY += 22;
    }

    // Total
    doc.moveTo(350, nextRowY).lineTo(545, nextRowY).strokeColor('#cccccc').stroke();
    nextRowY += 8;
    doc.fontSize(12).font('Helvetica-Bold').text('TOTAL', 50, nextRowY);
    doc.text(formatRM(total), 350, nextRowY, { width: 195, align: 'right' });

    // ── Payment details (if paid) ────────────────────────────────────────────
    if (invoice.status === 'PAID') {
      const payY = nextRowY + 45;
      doc.moveTo(50, payY - 10).lineTo(545, payY - 10).strokeColor('#cccccc').stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#27ae60').text('PAYMENT RECEIVED', 50, payY);
      doc.fillColor('#000000').font('Helvetica').fontSize(9);
      if (invoice.paidAt)        doc.text(`Date: ${formatDate(invoice.paidAt)}`);
      if (invoice.paymentMethod) doc.text(`Method: ${invoice.paymentMethod.replace('_', ' ')}`);
      if (invoice.referenceNo)   doc.text(`Reference: ${invoice.referenceNo}`);
      doc.fillColor('#555555').text(`Amount Paid: ${formatRM(Number(invoice.paidAmount))}`);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.fillColor('#aaaaaa').fontSize(8).font('Helvetica')
      .text('Generated by VersaHome Property Management', 50, 780, { align: 'center', width: 495 });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate PDF' });
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
      // Allow any amount >= 0; status is preserved exactly as-is
      data.amount = new Decimal(amount);
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
