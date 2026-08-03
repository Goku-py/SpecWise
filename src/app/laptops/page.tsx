import type { Metadata } from "next"
import { CatalogView } from "@/components/catalog/catalog-view"
import { getActiveCatalog, type CatalogEntry } from "@/lib/catalog-cache"
import { getRegionFromCookies } from "@/lib/region"
import type { CatalogLaptop } from "@/lib/types"

// Force dynamic: the page reads the region cookie on every request so
// switching regions in the header instantly updates the catalog grid.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Browse Laptops — SpecWise",
  description:
    "Browse and compare laptops across brands, specs, and retailers. Filter by price, processor, RAM, and more.",
}

function toCardDto(l: CatalogEntry): CatalogLaptop {
  const best = l.prices[0]
  return {
    id: l.id,
    slug: l.slug,
    brand: l.brand,
    model: l.model,
    variant: l.variant,
    os: l.os,
    cpuBrand: l.cpuBrand,
    cpuFamily: l.cpuFamily,
    cpuCores: l.cpuCores,
    gpuType: l.gpuType,
    gpuModel: l.gpuModel,
    ramAmount: l.ramAmount,
    storageAmount: l.storageAmount,
    storageType: l.storageType,
    displaySize: l.displaySize,
    displayResolution: l.displayResolution,
    displayRefreshRate: l.displayRefreshRate,
    weight: l.weight,
    batteryLife: l.batteryLife,
    imageUrl: l.imageUrl,
    reviewScore: l.reviewScore,
    isPopular: l.isPopular,
    price: best?.price ?? null,
    currency: best?.currency ?? "USD",
  }
}

export default async function LaptopsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const { q } = await searchParams
  const initialQuery = typeof q === "string" ? q : ""
  const region = await getRegionFromCookies()
  const catalog = await getActiveCatalog(region.code)
  const initialLaptops = catalog.map(toCardDto)

  return (
    <CatalogView
      initialLaptops={initialLaptops}
      initialRegion={region}
      initialQuery={initialQuery}
    />
  )
}
