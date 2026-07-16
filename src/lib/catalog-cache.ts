import { unstable_cache, revalidateTag } from "next/cache"
import { prisma } from "./prisma"
import type { ScorableLaptop } from "./types"

export const CATALOG_CACHE_TAG = "laptops-catalog"

const CATALOG_CACHE_TTL_SECONDS = Number(process.env.CATALOG_CACHE_TTL_SECONDS ?? 3600)

async function fetchActiveCatalog(region: string) {
  return prisma.laptop.findMany({
    where: { isActive: true },
    include: {
      prices: {
        where: { region },
        select: {
          laptopId: true,
          region: true,
          retailer: true,
          currency: true,
          price: true,
          url: true,
          affiliateUrl: true,
        },
        orderBy: { price: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export const getActiveCatalog = unstable_cache(
  fetchActiveCatalog,
  ["active-laptops-catalog"],
  {
    tags: [CATALOG_CACHE_TAG],
    revalidate: CATALOG_CACHE_TTL_SECONDS,
  }
)

export function invalidateCatalogCache() {
  // Next.js 16 requires a cache-life profile as the second argument.
  revalidateTag(CATALOG_CACHE_TAG, "max")
}

export type CatalogEntry = Awaited<ReturnType<typeof fetchActiveCatalog>>[number]

export function toScorable(l: CatalogEntry, region: string): ScorableLaptop {
  // Prices are already filtered by region and sorted by price at DB level
  const best = l.prices[0]
  const retailers = l.prices.map(p => ({
    retailer: p.retailer,
    price: p.price,
    currency: p.currency,
    url: p.url,
    affiliateUrl: p.affiliateUrl,
  }))
  return {
    id: l.id,
    brand: l.brand,
    model: l.model,
    variant: l.variant,
    price: best?.price ?? 0,
    currency: best?.currency ?? "USD",
    region: best?.region ?? region,
    url: best?.url ?? null,
    affiliateUrl: best?.affiliateUrl ?? null,
    os: l.os,
    cpuBrand: l.cpuBrand,
    cpuFamily: l.cpuFamily,
    cpuGeneration: l.cpuGeneration,
    cpuCores: l.cpuCores,
    gpuType: l.gpuType,
    gpuModel: l.gpuModel,
    gpuVRAM: l.gpuVRAM,
    ramAmount: l.ramAmount,
    ramUpgradeable: l.ramUpgradeable,
    storageAmount: l.storageAmount,
    storageType: l.storageType,
    storageExpandable: l.storageExpandable,
    displaySize: l.displaySize,
    displayResolution: l.displayResolution,
    displayRefreshRate: l.displayRefreshRate,
    displayPanelType: l.displayPanelType,
    displayBrightness: l.displayBrightness,
    displayColorGamut: l.displayColorGamut,
    displayTouch: l.displayTouch,
    batteryCapacity: l.batteryCapacity,
    batteryLife: l.batteryLife,
    weight: l.weight,
    buildMaterial: l.buildMaterial,
    webcamQuality: l.webcamQuality,
    ports: l.ports,
    wireless: l.wireless,
    securityFeatures: l.securityFeatures,
    keyboardBacklit: l.keyboardBacklit,
    isTouchscreen: l.isTouchscreen,
    isRefurbished: l.isRefurbished,
    isActive: l.isActive,
    isPopular: l.isPopular,
    imageUrl: l.imageUrl,
    reviewScore: l.reviewScore,
    notes: l.notes,
    retailers,
  }
}
