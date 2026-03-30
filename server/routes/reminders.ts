import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { sendEmail, rentalReminderTemplate, leaseExpiryTemplate } from '../lib/email.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

// ─── POST /api/reminders/rental — send rental payment reminders ───────────────
// Sends reminders to tenants whose rent is due within X days

router.post('/rental', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + 7); // remind 7 days before due

    // Find active bookings where tenant's rent cycle hits within 7 days
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: today },
      },
      include: {
        customer: true,
        room: { include: { property: true } },
      },
    });

    let sent = 0;
    for (const booking of bookings) {
      if (!booking.customer.email) continue;

      // Calculate next due date (monthly cycle from startDate)
      const start = new Date(booking.startDate);
      const nextDue = new Date(start);
      while (nextDue <= today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      const daysLeft = Math.ceil((nextDue.getTime() - today.getTime()) / 86400000);
      if (daysLeft <= 7 && daysLeft > 0) {
        await sendEmail(
          booking.customer.email,
          'VersaHome — Rental Payment Reminder',
          rentalReminderTemplate(
            booking.customer.name,
            booking.room.number,
            booking.room.property.name,
            nextDue.toLocaleDateString('en-MY'),
            booking.rentAmount,
            daysLeft
          )
        );
        sent++;
      }
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

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: today, lte: in30 },
      },
      include: {
        customer: true,
        room: { include: { property: true } },
      },
    });

    let sent = 0;
    for (const booking of bookings) {
      if (!booking.customer.email) continue;

      const daysLeft = Math.ceil(
        (booking.endDate.getTime() - today.getTime()) / 86400000
      );

      await sendEmail(
        booking.customer.email,
        'VersaHome — Lease Expiry Notice',
        leaseExpiryTemplate(
          booking.customer.name,
          booking.room.number,
          booking.room.property.name,
          booking.endDate.toLocaleDateString('en-MY'),
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
