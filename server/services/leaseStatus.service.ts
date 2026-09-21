import prisma from '../lib/prisma.js';

/**
 * Advance the parts of lease state that depend only on the clock.
 *
 * Nothing else in the system does this: a lease's status is computed when it is
 * created or edited and never again, so without this a lease that started last
 * week stays UPCOMING, its unit keeps reading VACANT on the Dashboard, Units
 * and Timeline pages, and rental reminders — which filter on ACTIVE — silently
 * skip that tenant.
 *
 * Deliberately does NOT auto-complete leases past their end date: COMPLETED
 * means an operator confirmed the tenancy ended and settled the deposit, which
 * is a judgement call, not a date comparison.
 *
 * Idempotent — safe to run on every request and on a timer.
 */
export async function syncLeaseStatuses(): Promise<{ activated: number; overdue: number }> {
  const now = new Date();
  // Lease dates are stored as UTC midnight, so compare against the end of
  // today in UTC: a lease starting today counts as started.
  const endOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999,
  ));

  const due = await prisma.leaseAgreement.findMany({
    where: { isActive: true, status: 'UPCOMING', startDate: { lte: endOfToday } },
    select: { id: true, unitId: true, carparkId: true },
  });

  if (due.length > 0) {
    const unitIds    = due.map(l => l.unitId).filter((id): id is string => !!id);
    const carparkIds = due.map(l => l.carparkId).filter((id): id is string => !!id);

    await prisma.$transaction(async (tx) => {
      await tx.leaseAgreement.updateMany({
        where: { id: { in: due.map(l => l.id) } },
        data:  { status: 'ACTIVE' },
      });
      if (unitIds.length) {
        await tx.unit.updateMany({ where: { id: { in: unitIds } }, data: { status: 'OCCUPIED' } });
      }
      if (carparkIds.length) {
        await tx.carpark.updateMany({ where: { id: { in: carparkIds } }, data: { status: 'OCCUPIED' } });
      }
    });
  }

  const { count: overdue } = await prisma.invoice.updateMany({
    where: { status: 'PENDING', dueDate: { lt: now }, lease: { isActive: true } },
    data:  { status: 'OVERDUE' },
  });

  return { activated: due.length, overdue };
}
