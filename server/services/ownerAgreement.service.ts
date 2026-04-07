/**
 * Returns the payment date for a given year/month, clamping paymentDay
 * to the last day of the month to handle months with fewer days (e.g. Feb).
 */
function paymentDate(year: number, month: number, paymentDay: number): Date {
  // month is 0-indexed (0 = January)
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(paymentDay, lastDay);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Generate one PENDING expense per calendar month for the full agreement duration.
 * Upserts an "Owner Payment" expense type if it doesn't exist.
 * Must be called inside a Prisma transaction.
 */
export async function generateOwnerExpenses(tx: any, agreement: any): Promise<void> {
  const expenseType = await tx.expenseType.upsert({
    where:  { name: 'Owner Payment' },
    create: { name: 'Owner Payment', description: 'Monthly owner payment generated from agreement' },
    update: {},
  });

  const start = new Date(agreement.startDate);
  const end   = new Date(agreement.endDate);

  let year  = start.getUTCFullYear();
  let month = start.getUTCMonth(); // 0-indexed
  const endYear  = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();

  const records: any[] = [];

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const due = paymentDate(year, month, agreement.paymentDay);
    const label = due.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    records.push({
      unitId:           agreement.unitId,
      ownerAgreementId: agreement.id,
      expenseTypeId:    expenseType.id,
      amount:           agreement.amount,
      expenseDate:      due,
      dueDate:          due,
      status:           'PENDING',
      description:      `Owner payment — ${label}`,
    });

    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }

  if (records.length > 0) {
    await tx.expense.createMany({ data: records });
  }
}

/**
 * Soft-delete all PENDING expenses linked to this agreement whose dueDate
 * is strictly after `afterDate`. Called on early termination.
 */
export async function voidFutureExpenses(tx: any, agreementId: string, afterDate: Date): Promise<void> {
  await tx.expense.updateMany({
    where: {
      ownerAgreementId: agreementId,
      status:           'PENDING',
      isActive:         true,
      dueDate:          { gt: afterDate },
    },
    data: { isActive: false },
  });
}
