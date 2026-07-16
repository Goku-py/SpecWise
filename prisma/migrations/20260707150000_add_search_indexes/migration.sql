-- Enable pg_trgm extension for ILIKE search support
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex: GIN trigram index for ILIKE search on brand and model
-- ponytail: leading-wildcard ILIKE needs pg_trgm; b-tree won't help
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Laptop_brand_model_trgm_idx"
  ON "Laptop" USING GIN ("brand" gin_trgm_ops, "model" gin_trgm_ops);

-- CreateIndex: composite index for the prices join (laptopId + region + price)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LaptopPrice_laptopId_region_price_idx"
  ON "LaptopPrice"("laptopId", "region", "price");
