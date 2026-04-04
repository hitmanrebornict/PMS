-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('DAILY', 'FIXED_TERM', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeaseStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'TERMINATED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'HELD', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "lease_agreements" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "unitId" TEXT,
    "carparkId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'UPCOMING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lease_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_deposits" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lease_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lease_deposits_leaseId_key" ON "lease_deposits"("leaseId");

-- AddForeignKey
ALTER TABLE "lease_agreements" ADD CONSTRAINT "lease_agreements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_agreements" ADD CONSTRAINT "lease_agreements_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_agreements" ADD CONSTRAINT "lease_agreements_carparkId_fkey" FOREIGN KEY ("carparkId") REFERENCES "carparks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_deposits" ADD CONSTRAINT "lease_deposits_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
