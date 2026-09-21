import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { sendEmail, rentalReminderTemplate, leaseExpiryTemplate } from '../lib/email.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

/**
 * A lease belongs to either a Customer or a Company, never both, so `customer`
 * is null on every company lease. Resolve whichever one is present.
 */
function resolveRecipient(lease: { customer?: any; company?: any }): { name: string; email: string } | null {
  const email = lease.customer?.email ?? lease.company?.email ?? null;
  if (!email) return null;
  return { name: lease.customer?.name ?? lease.company?.name ?? 'Customer', email };
}

function assetLabelFor(lease: { unit?: any; carpark?: any }): string {
  if (lease.unit)    return `${lease.unit.unitNumber} (${lease.unit.property.name})`;
  if (lease.carpark) return `Carpark ${lease.carpark.carparkNumber}`;
  return 'Unknown Asset';
}

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
        lease: { status: 'ACTIVE', isActive: true },
      },
      include: {
        lease: {
          include: {
            customer: true,
            company: true,
            unit: { include: { property: true } },
            carpark: true,
          },
        },
      },
    });

    let sent = 0, skipped = 0, failed = 0;
    for (const invoice of pendingInvoices) {
      const recipient = resolveRecipient(invoice.lease);
      if (!recipient) { skipped++; continue; }

      const daysLeft = Math.ceil((invoice.dueDate.getTime() - today.getTime()) / 86400000);

      // One bad address must not abort the whole batch.
      try {
        await sendEmail(
          recipient.email,
          'VersaHome — Rental Payment Reminder',
          rentalReminderTemplate(
            recipient.name,
            assetLabelFor(invoice.lease),
            invoice.dueDate.toLocaleDateString('en-MY'),
            Number(invoice.amount),
            daysLeft
          )
        );
        sent++;
      } catch (err) {
        failed++;
        console.error(`Rental reminder failed for invoice ${invoice.id} (${recipient.email}):`, err);
      }
    }

    res.json({
      message: `Sent ${sent} rental reminder(s)`
        + (skipped ? `, skipped ${skipped} with no email on file` : '')
        + (failed ? `, ${failed} failed to send` : ''),
      sent, skipped, failed,
    });
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
        isActive: true,
        endDate: { gte: today, lte: in30 },
      },
      include: {
        customer: true,
        company: true,
        unit: { include: { property: true } },
        carpark: true,
      },
    });

    let sent = 0, skipped = 0, failed = 0;
    for (const lease of leases) {
      const recipient = resolveRecipient(lease);
      if (!recipient) { skipped++; continue; }

      const daysLeft = Math.ceil((lease.endDate.getTime() - today.getTime()) / 86400000);

      try {
        await sendEmail(
          recipient.email,
          'VersaHome — Lease Expiry Notice',
          leaseExpiryTemplate(
            recipient.name,
            assetLabelFor(lease),
            lease.endDate.toLocaleDateString('en-MY'),
            daysLeft
          )
        );
        sent++;
      } catch (err) {
        failed++;
        console.error(`Lease expiry notice failed for lease ${lease.id} (${recipient.email}):`, err);
      }
    }

    res.json({
      message: `Sent ${sent} lease expiry notice(s)`
        + (skipped ? `, skipped ${skipped} with no email on file` : '')
        + (failed ? `, ${failed} failed to send` : ''),
      sent, skipped, failed,
    });
  } catch (err) {
    console.error('Lease reminder error:', err);
    res.status(500).json({ error: 'Failed to send lease notices' });
  }
});

export default router;
