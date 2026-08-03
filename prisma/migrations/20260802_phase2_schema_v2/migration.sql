-- Phase 2a: Schema v2
--  * Status enum replaces the boolean isActive column (active/archived/draft)
--  * Laptop.slug (non-unique, nullable; uniqueness enforced in app code) + Laptop.brandId (optional FK)
--  * New Brand, Retailer, PriceSnapshot tables
--
-- Generated with `prisma migrate diff --from-config-datasource --to-schema ... --script`,
-- then hand-edited: (1) added the isActive -> status backfill, (2) kept the
-- hand-created "Laptop_brand_model_trgm_idx" search index that Prisma cannot see
-- in the datamodel, (3) reordered ALTERs so the backfill runs before the column drop.

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('draft', 'active', 'archived');

-- AlterTable (additive first — keep isActive until the backfill below runs)
ALTER TABLE "Laptop" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'active';

-- Backfill status from the legacy isActive flag (isActive=true -> active, else archived)
UPDATE "Laptop" SET "status" = CASE WHEN "isActive" THEN 'active'::"Status" ELSE 'archived'::"Status" END;

-- DropIndex
DROP INDEX "Laptop_isActive_createdAt_idx";

-- AlterTable (now that the backfill has run, drop the legacy column)
ALTER TABLE "Laptop" DROP COLUMN "isActive";

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "linkTemplate" TEXT,
    "affiliateProgram" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "laptopId" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_code_key" ON "Retailer"("code");

-- CreateIndex
CREATE INDEX "PriceSnapshot_laptopId_capturedAt_idx" ON "PriceSnapshot"("laptopId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_laptopId_retailer_region_capturedAt_key" ON "PriceSnapshot"("laptopId", "retailer", "region", "capturedAt");

-- CreateIndex
CREATE INDEX "Laptop_status_createdAt_idx" ON "Laptop"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Laptop_slug_idx" ON "Laptop"("slug");

-- AddForeignKey
ALTER TABLE "Laptop" ADD CONSTRAINT "Laptop_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
