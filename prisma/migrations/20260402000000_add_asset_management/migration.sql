-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('STUDIO', 'ONE_BEDROOM', 'TWO_BEDROOM', 'BUNGALOW', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "master_properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "type" "UnitType" NOT NULL DEFAULT 'OTHER',
    "suggestedRentalPrice" DECIMAL(10,2) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'VACANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carparks" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "carparkNumber" TEXT NOT NULL,
    "suggestedRentalPrice" DECIMAL(10,2) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'VACANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carparks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "units_propertyId_unitNumber_key" ON "units"("propertyId", "unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "carparks_propertyId_carparkNumber_key" ON "carparks"("propertyId", "carparkNumber");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "master_properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carparks" ADD CONSTRAINT "carparks_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "master_properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
