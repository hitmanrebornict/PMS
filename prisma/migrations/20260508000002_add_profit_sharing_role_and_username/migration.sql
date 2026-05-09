-- Add PROFIT_SHARING to Role enum
ALTER TYPE "Role" ADD VALUE 'PROFIT_SHARING';

-- Add username column to users
ALTER TABLE "users" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
