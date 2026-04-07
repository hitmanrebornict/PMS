-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'MATURED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "investments" (
    "id"            TEXT NOT NULL,
    "customerId"    TEXT NOT NULL,
    "unitId"        TEXT NOT NULL,
    "capitalAmount" DECIMAL(12,2) NOT NULL,
    "startDate"     TIMESTAMP(3) NOT NULL,
    "endDate"       TIMESTAMP(3) NOT NULL,
    "status"        "InvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes"         TEXT,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
