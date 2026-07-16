-- CreateTable
CREATE TABLE "Laptop" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "region" TEXT NOT NULL DEFAULT 'US',
    "url" TEXT,
    "affiliateUrl" TEXT,
    "os" TEXT NOT NULL,
    "cpuBrand" TEXT NOT NULL,
    "cpuFamily" TEXT NOT NULL,
    "cpuGeneration" TEXT,
    "cpuCores" INTEGER,
    "cpuBenchmark" INTEGER,
    "gpuType" TEXT NOT NULL DEFAULT 'integrated',
    "gpuModel" TEXT,
    "gpuVRAM" INTEGER,
    "ramAmount" INTEGER NOT NULL,
    "ramType" TEXT,
    "ramUpgradeable" BOOLEAN NOT NULL DEFAULT false,
    "storageAmount" INTEGER NOT NULL,
    "storageType" TEXT NOT NULL DEFAULT 'SSD',
    "storageExpandable" BOOLEAN NOT NULL DEFAULT false,
    "displaySize" DOUBLE PRECISION NOT NULL,
    "displayResolution" TEXT,
    "displayRefreshRate" INTEGER NOT NULL DEFAULT 60,
    "displayPanelType" TEXT,
    "displayBrightness" INTEGER,
    "displayColorGamut" TEXT,
    "displayTouch" BOOLEAN NOT NULL DEFAULT false,
    "batteryCapacity" INTEGER,
    "batteryLife" INTEGER,
    "weight" DOUBLE PRECISION,
    "buildMaterial" TEXT,
    "webcamQuality" TEXT,
    "ports" TEXT[],
    "wireless" TEXT,
    "securityFeatures" TEXT[],
    "keyboardBacklit" BOOLEAN NOT NULL DEFAULT false,
    "isTouchscreen" BOOLEAN NOT NULL DEFAULT false,
    "isRefurbished" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "reviewScore" DOUBLE PRECISION,
    "notes" TEXT,
    "priceLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Laptop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UseCase" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaptopUseCase" (
    "laptopId" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "score" INTEGER,

    CONSTRAINT "LaptopUseCase_pkey" PRIMARY KEY ("laptopId","useCaseId")
);

-- CreateTable
CREATE TABLE "UseCaseWeight" (
    "id" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UseCaseWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UseCase_slug_key" ON "UseCase"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UseCaseWeight_useCaseId_attribute_key" ON "UseCaseWeight"("useCaseId", "attribute");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "LaptopUseCase" ADD CONSTRAINT "LaptopUseCase_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "Laptop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaptopUseCase" ADD CONSTRAINT "LaptopUseCase_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "UseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UseCaseWeight" ADD CONSTRAINT "UseCaseWeight_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "UseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
