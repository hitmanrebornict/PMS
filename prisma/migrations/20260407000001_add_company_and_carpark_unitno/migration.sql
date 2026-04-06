-- ─── Create companies table ────────────────────────────────────────────────
CREATE TABLE "companies" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "managerName"    TEXT,
    "email"          TEXT,
    "phone"          TEXT,
    "tinNumber"      TEXT,
    "address"        TEXT,
    "wechatId"       TEXT,
    "whatsappNumber" TEXT,
    "dataSourceId"   TEXT,
    "remark"         TEXT,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- ─── FK: companies → data_sources ──────────────────────────────────────────
ALTER TABLE "companies" ADD CONSTRAINT "companies_dataSourceId_fkey"
    FOREIGN KEY ("dataSourceId") REFERENCES "data_sources"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Add companyId to lease_agreements ─────────────────────────────────────
ALTER TABLE "lease_agreements" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- ─── Make customerId nullable ───────────────────────────────────────────────
ALTER TABLE "lease_agreements" ALTER COLUMN "customerId" DROP NOT NULL;

-- ─── FK: lease_agreements → companies ──────────────────────────────────────
ALTER TABLE "lease_agreements" ADD CONSTRAINT "lease_agreements_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Add unitNo to carparks ─────────────────────────────────────────────────
ALTER TABLE "carparks" ADD COLUMN IF NOT EXISTS "unitNo" TEXT;
