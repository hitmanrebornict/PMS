-- Create unit_shares join table
CREATE TABLE "unit_shares" (
    "id"         TEXT          NOT NULL,
    "unitId"     TEXT          NOT NULL,
    "userId"     TEXT          NOT NULL,
    "percentage" DECIMAL(5,2)  NOT NULL,
    "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "unit_shares_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "unit_shares_unitId_userId_key" ON "unit_shares"("unitId", "userId");
ALTER TABLE "unit_shares" ADD CONSTRAINT "unit_shares_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_shares" ADD CONSTRAINT "unit_shares_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create profit_sharing_allocations snapshot table
CREATE TABLE "profit_sharing_allocations" (
    "id"                    TEXT          NOT NULL,
    "profitSharingRecordId" TEXT          NOT NULL,
    "userId"                TEXT          NOT NULL,
    "userName"              TEXT          NOT NULL,
    "percentage"            DECIMAL(5,2)  NOT NULL,
    "amount"                DECIMAL(10,2) NOT NULL,
    "createdAt"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "profit_sharing_allocations_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "profit_sharing_allocations" ADD CONSTRAINT "profit_sharing_allocations_profitSharingRecordId_fkey"
    FOREIGN KEY ("profitSharingRecordId") REFERENCES "profit_sharing_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profit_sharing_allocations" ADD CONSTRAINT "profit_sharing_allocations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
