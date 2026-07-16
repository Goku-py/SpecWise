-- Add retailer column to LaptopPrice if it doesn't exist, defaulting to 'default'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'LaptopPrice' AND column_name = 'retailer'
    ) THEN
        ALTER TABLE "LaptopPrice" ADD COLUMN "retailer" TEXT NOT NULL DEFAULT 'default';
    END IF;
END $$;

-- Backfill any NULL or empty retailer values so the PK transition is safe
UPDATE "LaptopPrice"
SET "retailer" = 'default'
WHERE "retailer" IS NULL OR "retailer" = '';

-- Add a temporary UNIQUE guard to prevent duplicates while rebuilding the primary key.
-- We use IF NOT EXISTS so the migration stays idempotent.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'LaptopPrice'
          AND indexname = 'LaptopPrice_laptopId_region_retailer_key'
    ) THEN
        CREATE UNIQUE INDEX "LaptopPrice_laptopId_region_retailer_key"
        ON "LaptopPrice"("laptopId", "region", "retailer");
    END IF;
END $$;

-- Drop the old primary key if it exists
ALTER TABLE "LaptopPrice" DROP CONSTRAINT IF EXISTS "LaptopPrice_pkey";

-- Create the new composite primary key that matches schema.prisma
ALTER TABLE "LaptopPrice" ADD CONSTRAINT "LaptopPrice_pkey" PRIMARY KEY ("laptopId", "region", "retailer");
