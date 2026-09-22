import { unstable_cache, revalidateTag } from "next/cache"
import { prisma } from "./prisma"
import type { ScorableLaptop } from "./types"

export const CATALOG_CACHE_TAG = "laptops-catalog"

const CATALOG_CACHE_TTL_SECONDS = Number(process.env.CATALOG_CACHE_TTL_SECONDS ?? 3600)

async function fetchActiveCatalog(region: string) {
  return prisma.laptop.findMany({
    where: { status: "active" },
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
          inStock: true,
          validUntil: true,
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

async function fetchLaptopById(id: string) {
  return prisma.laptop.findUnique({
    where: { id },
    include: {
      prices: {
        select: {
          region: true,
          retailer: true,
          currency: true,
          price: true,
          url: true,
          affiliateUrl: true,
          inStock: true,
          validUntil: true,
        },
        orderBy: { price: "asc" },
      },
    },
  })
}

// Same shape as GET /api/laptops/[id]. Shares the catalog tag so admin
// toggle/seed invalidation busts detail pages too.
export const getLaptopById = unstable_cache(
  fetchLaptopById,
  ["laptop-by-id"],
  {
    tags: [CATALOG_CACHE_TAG],
    revalidate: CATALOG_CACHE_TTL_SECONDS,
  }
)

async function fetchLaptopBySlug(slug: string) {
  return prisma.laptop.findFirst({
    where: { slug },
    include: {
      prices: {
        select: {
          region: true,
          retailer: true,
          currency: true,
          price: true,
          url: true,
          affiliateUrl: true,
          inStock: true,
          validUntil: true,
        },
        orderBy: { price: "asc" },
      },
    },
  })
}

// Slug lookup for the SEO URL identity. Shares the same catalog tag + TTL as
// getLaptopById so invalidation keeps both fresh.
export const getLaptopBySlug = unstable_cache(
  fetchLaptopBySlug,
  ["laptop-by-slug"],
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

export interface OfferRow {
  price: number
  inStock: boolean
  validUntil: Date | string | null
}

/**
 * Phase 3 offer selection (pure, unit-tested): cheapest *valid* offer wins
 * (in stock and unexpired). When no valid offer exists but stale rows do,
 * the cheapest stale row is kept with `stale: true` — representable and
 * explicit, never silently missing and never a fabricated zero. No rows at
 * all yields `best: null` (caller flags priceMissing).
 */
export function pickBestOffer<T extends OfferRow>(
  prices: readonly T[],
  now: number = Date.now()
): { best: T | null; stale: boolean } {
  const isValid = (p: T): boolean => {
    if (!p.inStock) return false
    if (p.validUntil == null) return true
    const t = p.validUntil instanceof Date ? p.validUntil.getTime() : new Date(p.validUntil).getTime()
    return Number.isFinite(t) && t > now
  }
  // Sorted defensively: callers pass DB price-ascending rows, but the
  // cheapest-valid contract must hold regardless of input order.
  const ordered = [...prices].sort((a, b) => a.price - b.price)
  const best = ordered.find(isValid) ?? ordered[0] ?? null
  return { best, stale: best != null && !isValid(best) }
}

export function toScorable(l: CatalogEntry, region: string): ScorableLaptop {
  // Prices are already filtered by region and sorted by price at DB level
  const { best, stale } = pickBestOffer(l.prices)
  const retailers = l.prices.map(p => ({
    retailer: p.retailer,
    price: p.price,
    currency: p.currency,
    url: p.url,
    affiliateUrl: p.affiliateUrl,
    inStock: p.inStock,
    validUntil: p.validUntil?.toISOString() ?? null,
  }))
  return {
    id: l.id,
    brand: l.brand,
    model: l.model,
    variant: l.variant,
    price: best?.price ?? 0,
    // Phase 2G: missing price is flagged, never a zero-price advantage.
    priceMissing: best == null,
    // Phase 3: stale offer picked (out-of-stock or past validUntil).
    priceStale: stale,
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
    // Derived from status for scoring.ts compatibility (which filters on isActive
    // and must not be touched in phase 2).
    isActive: l.status === "active",
    isPopular: l.isPopular,
    imageUrl: l.imageUrl,
    reviewScore: l.reviewScore,
    notes: l.notes,
    retailers,
  }
}
