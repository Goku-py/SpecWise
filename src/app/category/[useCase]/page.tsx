import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { ResultsGrid } from "@/components/results/results-grid"
import { getActiveCatalog, toScorable } from "@/lib/catalog-cache"
import { getRegionFromCookies } from "@/lib/region"
import { runV3 } from "@/lib/recommend/v3/engine"
import { CATEGORY_LABELS, categoryProfile, isCategorySlug } from "@/lib/recommend/v3/categories"
import type { RecommendedLaptop, ScorableLaptop } from "@/lib/types"
import type { RankedItemDTO } from "@/lib/recommend/v3/types"

// Force dynamic: reads the region cookie for scoring and pricing.
export const dynamic = "force-dynamic"

type CategoryPageProps = { params: Promise<{ useCase: string }> }

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { useCase } = await params
  if (!isCategorySlug(useCase)) return { title: "Category not found" }
  const label = CATEGORY_LABELS[useCase]
  return {
    title: `Best ${label} Laptops — SpecWise`,
    description: `Top ${label.toLowerCase()} laptops ranked by our spec-matching engine. Compare specs and regional prices.`,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { useCase } = await params
  // Valid slugs are the category keys (e.g. "coding"); "developer" is not.
  if (!isCategorySlug(useCase)) notFound()

  // Single pipeline: catalog → v3 engine. Items are mapped to the shared
  // display shape (field mapping only — no scoring is recomputed here).
  const region = await getRegionFromCookies()
  const rawCatalog = await getActiveCatalog(region.code)
  const scorable = rawCatalog.map(l => toScorable(l, region.code))
  const byId = new Map(scorable.map(s => [s.id, s]))
  const dto = runV3(scorable, categoryProfile(useCase, region.code, region.currency))
  const results: RecommendedLaptop[] = dto.items
    .map(item => toDisplayItem(item, byId.get(item.laptopId)))
    .filter((r): r is RecommendedLaptop => r !== null)

  const label = CATEGORY_LABELS[useCase]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground">
          ← Back home
        </Link>
        <h1 className="text-3xl font-bold">{label}</h1>
        <p className="mt-1 text-sm text-muted">
          Top picks tailored to {label.toLowerCase()} use.
        </p>
      </div>
      <ErrorBoundary>
        <ResultsGrid results={results} />
      </ErrorBoundary>
    </div>
  )
}

/** Display-shape mapping for the shared grid (no scoring — scores pass through). */
function toDisplayItem(item: RankedItemDTO, s: ScorableLaptop | undefined): RecommendedLaptop | null {
  if (!s) return null
  return {
    id: s.id,
    brand: s.brand,
    model: s.model,
    variant: s.variant,
    price: item.price ?? 0,
    currency: s.currency,
    region: s.region,
    url: s.url,
    affiliateUrl: s.affiliateUrl,
    os: s.os,
    cpuBrand: s.cpuBrand,
    cpuFamily: s.cpuFamily,
    cpuGeneration: s.cpuGeneration,
    cpuCores: s.cpuCores,
    gpuType: s.gpuType,
    gpuModel: s.gpuModel,
    gpuVRAM: s.gpuVRAM,
    ramAmount: s.ramAmount,
    ramUpgradeable: s.ramUpgradeable,
    storageAmount: s.storageAmount,
    storageType: s.storageType,
    storageExpandable: s.storageExpandable,
    displaySize: s.displaySize,
    displayResolution: s.displayResolution,
    displayRefreshRate: s.displayRefreshRate,
    displayPanelType: s.displayPanelType,
    displayBrightness: s.displayBrightness,
    weight: s.weight,
    batteryLife: s.batteryLife,
    imageUrl: s.imageUrl,
    reviewScore: s.reviewScore,
    isPopular: s.isPopular,
    matchScore: item.scores.overall,
    matchReasons: item.strengths.map(st => `${st.dim}: ${st.evidence}`).slice(0, 4),
    tradeoffs: [...item.compromises, ...item.missedPreferred.map(m => `${m.id}: wanted ${m.required}, has ${m.actual}`)].slice(0, 3),
    retailers: s.retailers ?? [],
    priceMissing: item.priceMissing,
    priceStale: item.priceStale,
    scoringVersion: "v3.1",
    weightsVersion: "v3.1",
    relaxed: false,
    exhausted: false,
  }
}
