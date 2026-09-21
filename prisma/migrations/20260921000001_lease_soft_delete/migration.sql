-- Soft-delete support for lease agreements.
-- Leases were previously never removed — only their status changed. A lease booked
-- by mistake had no way out, so add the same isActive flag every other deletable
-- model uses. Existing rows stay visible.
ALTER TABLE "lease_agreements" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
