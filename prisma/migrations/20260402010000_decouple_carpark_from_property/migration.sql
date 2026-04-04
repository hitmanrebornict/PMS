-- DropForeignKey
ALTER TABLE "carparks" DROP CONSTRAINT IF EXISTS "carparks_propertyId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "carparks_propertyId_carparkNumber_key";

-- AlterTable: drop propertyId column
ALTER TABLE "carparks" DROP COLUMN IF EXISTS "propertyId";

-- CreateIndex: carparkNumber is now unique on its own
CREATE UNIQUE INDEX "carparks_carparkNumber_key" ON "carparks"("carparkNumber");
