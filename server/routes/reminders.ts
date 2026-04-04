import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { sendEmail, rentalReminderTemplate, leaseExpiryTemplate } from '../lib/email.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

// ─── POST /api/reminders/rental — send rental payment reminders ───────────────
// Sends reminders to tenants whose next invoice is due within 7 days

router.post('/rental', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + 7);

    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: today, lte: soon },
        lease: { status: 'ACTIVE' },
      },
      include: {
        lease: {
          include: {
            customer: true,
            unit: { include: { property: true } },
            carpark: true,
          },
        },
      },
    });

    let sent = 0;
    for (const invoice of pendingInvoices) {
      const { customer, unit, carpark } = invoice.lease;
      if (!customer.email) continue;

      const assetLabel = unit
        ? `${unit.unitNumber} (${unit.property.name})`
        : carpark
        ? `Carpark ${carpark.carparkNumber}`
        : 'Unknown Asset';

      const daysLeft = Math.ceil((invoice.dueDate.getTime() - today.getTime()) / 86400000);

      await sendEmail(
        customer.email,
        'VersaHome — Rental Payment Reminder',
        rentalReminderTemplate(
          customer.name,
          assetLabel,
          invoice.dueDate.toLocaleDateString('en-MY'),
          Number(invoice.amount),
          daysLeft
        )
      );
      sent++;
    }

    res.json({ message: `Sent ${sent} rental reminder(s)` });
  } catch (err) {
    console.error('Reminder error:', err);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// ─── POST /api/reminders/lease — send lease expiry notices ───────────────────

router.post('/lease', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);

    const leases = await prisma.leaseAgreement.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: today, lte: in30 },
      },
      include: {
        customer: true,
        unit: { include: { property: true } },
        carpark: true,
      },
    });

    let sent = 0;
    for (const lease of leases) {
      if (!lease.customer.email) continue;

      const assetLabel = lease.unit
        ? `${lease.unit.unitNumber} (${lease.unit.property.name})`
        : lease.carpark
        ? `Carpark ${lease.carpark.carparkNumber}`
        : 'Unknown Asset';

      const daysLeft = Math.ceil((lease.endDate.getTime() - today.getTime()) / 86400000);

      await sendEmail(
        lease.customer.email,
        'VersaHome — Lease Expiry Notice',
        leaseExpiryTemplate(
          lease.customer.name,
          assetLabel,
          lease.endDate.toLocaleDateString('en-MY'),
          daysLeft
        )
      );
      sent++;
    }

    res.json({ message: `Sent ${sent} lease expiry notice(s)` });
  } catch (err) {
    console.error('Lease reminder error:', err);
    res.status(500).json({ error: 'Failed to send lease notices' });
  }
});

export default router;
