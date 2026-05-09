-- Add guaranteeFee to units
ALTER TABLE "units" ADD COLUMN "guaranteeFee" DECIMAL(10,2);

-- Create profit_sharing_records table
CREATE TABLE "profit_sharing_records" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "guaranteeFeeSnapshot" DECIMAL(10,2) NOT NULL,
    "totalSales" DECIMAL(10,2) NOT NULL,
    "totalExpenses" DECIMAL(10,2) NOT NULL,
    "netProfit" DECIMAL(10,2) NOT NULL,
    "finalProfit" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_sharing_records_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "profit_sharing_records" ADD CONSTRAINT "profit_sharing_records_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique constraint
CREATE UNIQUE INDEX "profit_sharing_records_unitId_month_year_key"
    ON "profit_sharing_records"("unitId", "month", "year");
