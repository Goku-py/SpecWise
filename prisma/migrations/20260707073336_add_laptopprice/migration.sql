-- CreateTable
CREATE TABLE "LaptopPrice" (
    "laptopId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "url" TEXT,
    "affiliateUrl" TEXT,
    "priceLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaptopPrice_pkey" PRIMARY KEY ("laptopId","region")
);

-- AddForeignKey
ALTER TABLE "LaptopPrice" ADD CONSTRAINT "LaptopPrice_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
