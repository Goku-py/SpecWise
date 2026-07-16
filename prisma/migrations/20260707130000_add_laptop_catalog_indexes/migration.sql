-- CreateIndex
CREATE INDEX IF NOT EXISTS "Laptop_isActive_createdAt_idx" ON "Laptop"("isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaptopPrice_region_idx" ON "LaptopPrice"("region");
