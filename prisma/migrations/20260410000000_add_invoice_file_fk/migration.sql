-- AlterTable: add leaseId to files for lease document attachments
ALTER TABLE "files" ADD COLUMN "leaseId" TEXT;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "lease_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
