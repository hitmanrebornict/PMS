-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "paymentMethod" "PaymentMethod";
ALTER TABLE "invoices" ADD COLUMN "referenceNo" TEXT;
