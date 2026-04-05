import prisma from '../lib/prisma.js';
import { BillingCycle, LeaseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateLeaseInput {
  customer: {
    icPassport: string;
    name: string;
    phoneLocal: string;
    email?: string;
    currentAddress?: string;
  };
  unitId: string | null;
  carparkId: string | null;
  startDate: Date;
  endDate: Date;
  billingCycle: BillingCycle;
  unitPrice: number;
  depositAmount: number;
  notes?: string;
}

/**
 * Check if there's an overlapping ACTIVE or UPCOMING lease for the given asset.
 */
export async function checkConflict(
  unitId: string | null,
  carparkId: string | null,
  startDate: Date,
  endDate: Date,
  excludeLeaseId?: string,
): Promise<boolean> {
  const where: any = {
    status: { in: ['ACTIVE', 'UPCOMING'] as LeaseStatus[] },
    startDate: { lt: endDate },
    endDate: { gt: startDate },
  };

  if (excludeLeaseId) {
    where.id = { not: excludeLeaseId };
  }

  if (unitId) {
    where.unitId = unitId;
  } else if (carparkId) {
    where.carparkId = carparkId;
  }

  const count = await prisma.leaseAgreement.count({ where });
  return count > 0;
}

/**
 * Generate invoice data based on billing cycle.
 */
export function generateInvoiceData(
  startDate: Date,
  endDate: Date,
  billingCycle: BillingCycle,
  unitPrice: number,
  totalAmount: number,
): Array<{ periodStart: Date; periodEnd: Date; amount: number; dueDate: Date }> {
  const invoices: Array<{ periodStart: Date; periodEnd: Date; amount: number; dueDate: Date }> = [];

  if (billingCycle === 'DAILY') {
    // Single invoice for the total amount
    invoices.push({
      periodStart: startDate,
      periodEnd: endDate,
      amount: totalAmount,
      dueDate: startDate,
    });
  } else if (billingCycle === 'FIXED_TERM') {
    // One invoice per calendar month
    let current = new Date(startDate);
    while (current < endDate) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      const periodEnd = monthEnd > endDate ? endDate : monthEnd;
      invoices.push({
        periodStart: new Date(current),
        periodEnd,
        amount: unitPrice,
        dueDate: new Date(current),
      });
      current = monthEnd;
    }
  } else if (billingCycle === 'MONTHLY') {
    // One invoice per calendar month for the full term
    let current = new Date(startDate);
    while (current < endDate) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      const periodEnd = monthEnd > endDate ? endDate : monthEnd;
      invoices.push({
        periodStart: new Date(current),
        periodEnd,
        amount: unitPrice,
        dueDate: new Date(current),
      });
      current = monthEnd;
    }
  }

  return invoices;
}

/**
 * Calculate total lease amount based on billing cycle.
 */
export function calculateTotalAmount(
  startDate: Date,
  endDate: Date,
  billingCycle: BillingCycle,
  unitPrice: number,
): number {
  if (billingCycle === 'DAILY') {
    // Inclusive both ends: 05/04 → 07/04 = 3 days
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1 || 1;
    return diffDays * unitPrice;
  } else {
    // FIXED_TERM and MONTHLY: count calendar months between start and end
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) || 1;
    return months * unitPrice;
  }
}

/**
 * Create a lease agreement with all related records in a single transaction.
 */
export async function createLease(input: CreateLeaseInput) {
  const { customer, unitId, carparkId, startDate, endDate, billingCycle, unitPrice, depositAmount, notes } = input;

  const totalAmount = calculateTotalAmount(startDate, endDate, billingCycle, unitPrice);

  return prisma.$transaction(async (tx) => {
    // 1. Conflict check
    const conflictWhere: any = {
      status: { in: ['ACTIVE', 'UPCOMING'] as LeaseStatus[] },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    };
    if (unitId) conflictWhere.unitId = unitId;
    else if (carparkId) conflictWhere.carparkId = carparkId;

    const conflictCount = await tx.leaseAgreement.count({ where: conflictWhere });
    if (conflictCount > 0) {
      throw new Error('CONFLICT');
    }

    // 2. Customer upsert
    const customerRecord = await tx.customer.upsert({
      where: { icPassport: customer.icPassport },
      update: {
        name: customer.name,
        phoneLocal: customer.phoneLocal,
        ...(customer.email ? { email: customer.email } : {}),
      },
      create: {
        name: customer.name,
        phoneLocal: customer.phoneLocal,
        icPassport: customer.icPassport,
        email: customer.email || null,
        currentAddress: customer.currentAddress || '',
      },
    });

    // 3. Create lease
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaseStart = new Date(startDate);
    leaseStart.setHours(0, 0, 0, 0);

    const status: LeaseStatus = leaseStart <= today ? 'ACTIVE' : 'UPCOMING';

    const lease = await tx.leaseAgreement.create({
      data: {
        customerId: customerRecord.id,
        unitId,
        carparkId,
        startDate,
        endDate,
        billingCycle,
        unitPrice: new Decimal(unitPrice),
        totalAmount: new Decimal(totalAmount),
        status,
        notes,
      },
    });

    // 4. Create deposit
    const deposit = await tx.leaseDeposit.create({
      data: {
        leaseId: lease.id,
        amount: new Decimal(depositAmount),
        status: 'PENDING',
      },
    });

    // 5. Generate invoices
    const invoiceData = generateInvoiceData(startDate, endDate, billingCycle, unitPrice, totalAmount);
    const invoices = await Promise.all(
      invoiceData.map((inv) =>
        tx.invoice.create({
          data: {
            leaseId: lease.id,
            periodStart: inv.periodStart,
            periodEnd: inv.periodEnd,
            amount: new Decimal(inv.amount),
            status: 'PENDING',
            dueDate: inv.dueDate,
          },
        }),
      ),
    );

    // 6. Update asset status if lease starts today or earlier
    if (status === 'ACTIVE') {
      if (unitId) {
        await tx.unit.update({
          where: { id: unitId },
          data: { status: 'OCCUPIED' },
        });
      }
      if (carparkId) {
        await tx.carpark.update({
          where: { id: carparkId },
          data: { status: 'OCCUPIED' },
        });
      }
    }

    return { lease, deposit, invoices, customer: customerRecord };
  });
}
