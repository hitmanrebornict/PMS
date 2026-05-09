-- Make currentAddress optional (nullable) so customers can be created without an address
ALTER TABLE "customers" ALTER COLUMN "currentAddress" DROP NOT NULL;
