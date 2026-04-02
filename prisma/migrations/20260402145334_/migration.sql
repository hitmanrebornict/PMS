/*
  Warnings:

  - You are about to drop the column `emergencyContact` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `icNumber` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `nationality` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `customers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customerNo]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[icPassport]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currentAddress` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `icPassport` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneLocal` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "customers_icNumber_key";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "emergencyContact",
DROP COLUMN "icNumber",
DROP COLUMN "nationality",
DROP COLUMN "notes",
DROP COLUMN "phone",
ADD COLUMN     "currentAddress" TEXT NOT NULL,
ADD COLUMN     "customerNo" SERIAL NOT NULL,
ADD COLUMN     "icPassport" TEXT NOT NULL,
ADD COLUMN     "phoneLocal" TEXT NOT NULL,
ADD COLUMN     "phoneOther" TEXT,
ADD COLUMN     "remark" TEXT,
ADD COLUMN     "wechatId" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerNo_key" ON "customers"("customerNo");

-- CreateIndex
CREATE UNIQUE INDEX "customers_icPassport_key" ON "customers"("icPassport");
