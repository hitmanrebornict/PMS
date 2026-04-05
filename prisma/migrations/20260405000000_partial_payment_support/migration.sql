-- Add PARTIALLY_HELD to DepositStatus enum
ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_HELD';

-- Add partial payment tracking to lease_deposits
ALTER TABLE "lease_deposits" ADD COLUMN IF NOT EXISTS "receivedAmount" DECIMAL(10,2);
ALTER TABLE "lease_deposits" ADD COLUMN IF NOT EXISTS "refundedAmount" DECIMAL(10,2);

-- Add paid amount tracking to invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
