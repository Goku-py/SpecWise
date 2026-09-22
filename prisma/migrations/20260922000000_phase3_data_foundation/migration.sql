-- Phase 3 data foundation (additive, transaction-safe, fully reversible).
-- Preconditions verified 2026-09-22 on dev data: 0 null/empty/duplicate/invalid
-- slugs; all LaptopPrice rows conform to the region/currency pairs below.
-- The pre-existing dev drift (AdminUser/UseCase tables, Lead unique index,
-- LaptopPrice PK applied out-of-band) is intentionally NOT touched here:
-- fresh `db:setup` environments build cleanly from history; this migration
-- only adds. Rollback: drop the added constraint/indexes/columns/table
-- (see PHASE-3-IMPLEMENTATION.md); no data is deleted by this migration.

-- 1. SlugRedirect: rename history for 308 chains (old slug -> laptop).
CREATE TABLE "SlugRedirect" (
  "id" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "laptopId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SlugRedirect_from_key" ON "SlugRedirect"("from");
CREATE INDEX "SlugRedirect_laptopId_idx" ON "SlugRedirect"("laptopId");
ALTER TABLE "SlugRedirect" ADD CONSTRAINT "SlugRedirect_laptopId_fkey"
  FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Slug uniqueness. Table is tiny (56 rows); a plain transactional unique
-- index takes milliseconds, so CONCURRENTLY (non-transactional, incompatible
-- with migrate) is not required. Replaces the non-unique slug index.
DROP INDEX IF EXISTS "Laptop_slug_idx";
CREATE UNIQUE INDEX "Laptop_slug_key" ON "Laptop"("slug");

-- 3. Provenance columns (nullable-safe defaults; no backfill needed).
ALTER TABLE "Laptop" ADD COLUMN "dataSource" TEXT NOT NULL DEFAULT 'seed';
ALTER TABLE "Laptop" ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);

-- 4. Offer state columns. Existing rows default to in-stock, no expiry,
-- preserving current read behavior exactly.
ALTER TABLE "LaptopPrice" ADD COLUMN "inStock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LaptopPrice" ADD COLUMN "validUntil" TIMESTAMP(3);

-- 5. Region/currency consistency. All 672 existing rows conform (verified).
ALTER TABLE "LaptopPrice" ADD CONSTRAINT "LaptopPrice_region_currency_check" CHECK (
  ("region" = 'US' AND "currency" = 'USD') OR
  ("region" = 'IN' AND "currency" = 'INR') OR
  ("region" = 'GB' AND "currency" = 'GBP') OR
  ("region" = 'DE' AND "currency" = 'EUR') OR
  ("region" = 'CA' AND "currency" = 'CAD') OR
  ("region" = 'AU' AND "currency" = 'AUD')
);
