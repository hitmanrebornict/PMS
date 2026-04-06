import prisma from '../lib/prisma.js';
import { BillingCycle, LeaseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateLeaseInput {
  renterType: 'customer' | 'company';
  // Individual customer
  customer?: {
    icPassport: string;
    name: string;
    phoneLocal: string;
    email?: string;
    currentAddress?: string;
  };
  // Company — either existing id or new record
  companyId?: string | null;
  company?: {
    name: string;
    managerName?: string;
    email?: string;
    phone?: string;
    tinNumber?: string;
    address?: string;
    wechatId?: string;
    whatsappNumber?: string;
    dataSourceId?: string | null;
    remark?: string;
  };
  unitId: string | null;
  carparkId: string | null;
  startDate: Date;
  endDate: Date;
  billingCycle: BillingCycle;
  unitPrice: number;
  promotionAmount: number;  // discount deducted from unitPrice per period
  depositAmount: number;
  cleaningFee: number;      // auto-created as expense per billing period (unit leases only)
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
 * Invoice amount = unitPrice - promotionAmount (effective rate per period).
 */
export function generateInvoiceData(
  startDate: Date,
  endDate: Date,
  billingCycle: BillingCycle,
  unitPrice: number,
  totalAmount: number,
  promotionAmount = 0,
): Array<{ periodStart: Date; periodEnd: Date; amount: number; dueDate: Date }> {
  const invoices: Array<{ periodStart: Date; periodEnd: Date; amount: number; dueDate: Date }> = [];
  const effectivePrice = unitPrice - promotionAmount;

  if (billingCycle === 'DAILY') {
    invoices.push({
      periodStart: startDate,
      periodEnd: endDate,
      amount: totalAmount,
      dueDate: startDate,
    });
  } else if (billingCycle === 'FIXED_TERM' || billingCycle === 'MONTHLY') {
    let current = new Date(startDate);
    while (current < endDate) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      const periodEnd = monthEnd > endDate ? endDate : monthEnd;
      invoices.push({
        periodStart: new Date(current),
        periodEnd,
        amount: effectivePrice,
        dueDate: new Date(current),
      });
      current = monthEnd;
    }
  }

  return invoices;
}

/**
 * Calculate total lease amount based on billing cycle and effective price (after promotion).
 */
export function calculateTotalAmount(
  startDate: Date,
  endDate: Date,
  billingCycle: BillingCycle,
  unitPrice: number,
  promotionAmount = 0,
): number {
  const effectivePrice = unitPrice - promotionAmount;

  if (billingCycle === 'DAILY') {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1 || 1;
    return diffDays * effectivePrice;
  } else {
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) || 1;
    return months * effectivePrice;
  }
}

/**
 * Create a lease agreement with all related records in a single transaction.
 */
export async function createLease(input: CreateLeaseInput) {
  const {
    renterType, customer, companyId, company,
    unitId, carparkId, startDate, endDate, billingCycle,
    unitPrice, promotionAmount, depositAmount, cleaningFee, notes,
  } = input;

  const totalAmount = calculateTotalAmount(startDate, endDate, billingCycle, unitPrice, promotionAmount);

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
    if (conflictCount > 0) throw new Error('CONFLICT');

    // 2. Resolve renter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaseStart = new Date(startDate);
    leaseStart.setHours(0, 0, 0, 0);
    const status: LeaseStatus = leaseStart <= today ? 'ACTIVE' : 'UPCOMING';

    let resolvedCustomerId: string | null = null;
    let resolvedCompanyId: string | null = null;

    if (renterType === 'customer' && customer) {
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
      resolvedCustomerId = customerRecord.id;
    } else if (renterType === 'company') {
      if (companyId) {
        resolvedCompanyId = companyId;
      } else if (company) {
        const newCompany: any = await (tx as any).company.create({
          data: {
            name: company.name,
            managerName: company.managerName || null,
            email: company.email || null,
            phone: company.phone || null,
            tinNumber: company.tinNumber || null,
            address: company.address || null,
            wechatId: company.wechatId || null,
            whatsappNumber: company.whatsappNumber || null,
            dataSourceId: company.dataSourceId || null,
            remark: company.remark || null,
          },
        });
        resolvedCompanyId = newCompany.id;
      }
    }

    // 3. Create lease
    const lease = await (tx.leaseAgreement as any).create({
      data: {
        customerId: resolvedCustomerId,
        companyId: resolvedCompanyId,
        unitId,
        carparkId,
        startDate,
        endDate,
        billingCycle,
        unitPrice: new Decimal(unitPrice),
        promotionAmount: new Decimal(promotionAmount),
        totalAmount: new Decimal(totalAmount),
        cleaningFee: new Decimal(cleaningFee),
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

    // 5. Generate invoices (amounts already net of promotion)
    const invoiceData = generateInvoiceData(startDate, endDate, billingCycle, unitPrice, totalAmount, promotionAmount);
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

    // 6. Auto-create cleaning fee expenses (unit leases only, one per billing period)
    if (cleaningFee > 0 && unitId) {
      // Upsert the "Cleaning Fee" expense type so it always exists
      const cleaningFeeType = await tx.expenseType.upsert({
        where: { name: 'Cleaning Fee' },
        create: {
          name: 'Cleaning Fee',
          description: 'Automatically generated cleaning fee per billing period',
        },
        update: {},
      });

      // Create one expense per billing period (same periods as invoices)
      await Promise.all(
        invoiceData.map((inv) =>
          tx.expense.create({
            data: {
              unitId,
              expenseTypeId: cleaningFeeType.id,
              amount: new Decimal(cleaningFee),
              description: `Cleaning fee`,
              expenseDate: inv.periodStart,
            },
          }),
        ),
      );
    }

    // 7. Update asset status if lease starts today or earlier
    if (status === 'ACTIVE') {
      if (unitId) await tx.unit.update({ where: { id: unitId }, data: { status: 'OCCUPIED' } });
      if (carparkId) await tx.carpark.update({ where: { id: carparkId }, data: { status: 'OCCUPIED' } });
    }

    return { lease, deposit, invoices };
  });
}
