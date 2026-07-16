/*
  Warnings:

  - You are about to drop the column `affiliateUrl` on the `Laptop` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Laptop` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Laptop` table. All the data in the column will be lost.
  - You are about to drop the column `priceLastUpdated` on the `Laptop` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `Laptop` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Laptop` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Laptop" DROP COLUMN "affiliateUrl",
DROP COLUMN "currency",
DROP COLUMN "price",
DROP COLUMN "priceLastUpdated",
DROP COLUMN "region",
DROP COLUMN "url";
