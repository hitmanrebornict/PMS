-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "OwnerAgreementStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'COMPLETED');

-- AlterTable: add new columns to expenses (existing rows default to PAID)
ALTER TABLE "expenses"
  ADD COLUMN "ownerAgreementId" TEXT,
  ADD COLUMN "dueDate"          TIMESTAMP(3),
  ADD COLUMN "paidAt"           TIMESTAMP(3),
  ADD COLUMN "status"           "ExpenseStatus" NOT NULL DEFAULT 'PAID';

-- Change default for new inserts to PENDING
ALTER TABLE "expenses" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable: owners
CREATE TABLE "owners" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "phone"       TEXT,
    "email"       TEXT,
    "icPassport"  TEXT,
    "bankAccount" TEXT,
    "bankName"    TEXT,
    "address"     TEXT,
    "notes"       TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable: owner_agreements
CREATE TABLE "owner_agreements" (
    "id"         TEXT NOT NULL,
    "ownerId"    TEXT NOT NULL,
    "unitId"     TEXT NOT NULL,
    "amount"     DECIMAL(10,2) NOT NULL,
    "startDate"  TIMESTAMP(3) NOT NULL,
    "endDate"    TIMESTAMP(3) NOT NULL,
    "paymentDay" INTEGER NOT NULL DEFAULT 7,
    "notes"      TEXT,
    "status"     "OwnerAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive"   BOOLEAN NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_agreements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "owner_agreements" ADD CONSTRAINT "owner_agreements_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "owner_agreements" ADD CONSTRAINT "owner_agreements_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ownerAgreementId_fkey"
    FOREIGN KEY ("ownerAgreementId") REFERENCES "owner_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
