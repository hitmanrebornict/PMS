-- Add promotionAmount and cleaningFee columns to lease_agreements
ALTER TABLE "lease_agreements" ADD COLUMN IF NOT EXISTS "promotionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "lease_agreements" ADD COLUMN IF NOT EXISTS "cleaningFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
