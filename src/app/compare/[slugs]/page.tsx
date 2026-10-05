import type { Metadata } from "next"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getLaptopById, getLaptopBySlug, pickBestOffer } from "@/lib/catalog-cache"
import { visibleCompareRows } from "@/components/compare/compare-rows"
import {
  CompareTable,
  type CompareTableColumn,
} from "@/components/compare/compare-table"
import { ComparePersonalization } from "@/components/compare/compare-personalization"
import { canonicalComparisonPath } from "@/lib/compare-pairs"
import { getRegionFromCookies } from "@/lib/region"
import { getRegion } from "@/lib/regions"
import { formatPrice } from "@/lib/utils"
import type { LaptopDetail, PriceEntry } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// Region cookie drives prices + JSON-LD (same contract as /laptops/[id]).
export const dynamic = "force-dynamic"
export const dynamicParams = true

type ComparePageProps = { params: Promise<{ slugs: string }> }

// ── Helpers ────────────────────────────────────────────────────────────────

function nameOf(l: LaptopDetail): string {
  return `${l.brand} ${l.model}${l.variant ? ` (${l.variant})` : ""}`
}

function shortName(l: LaptopDetail): string {
  return `${l.brand} ${l.model}`
}

function specSummary(l: LaptopDetail): string {
  const parts = [
    l.displaySize ? `${l.displaySize}" display` : null,
    l.displayResolution,
    l.cpuFamily ? `${l.cpuBrand} ${l.cpuFamily}` : null,
    l.ramAmount ? `${l.ramAmount} GB RAM` : null,
    l.storageAmount ? `${l.storageAmount} GB ${l.storageType}` : null,
  ]
  return parts.filter(Boolean).join(", ")
}

/**
 * A URL segment may be a slug OR a legacy id (the detail page accepts both).
 * Slug first — it is the canonical identity.
 */
async function resolveOne(segment: string): Promise<LaptopDetail | null> {
  const decoded = decodeURIComponent(segment)
  if (!decoded) return null
  return (await getLaptopBySlug(decoded)) ?? (await getLaptopById(decoded))
}

/**
 * Split `<a>-vs-<b>` into candidate pairs at every `-vs-` occurrence and return
 * the first pair where BOTH sides resolve to distinct laptops. Trying every
 * split (instead of just the first) costs at most a couple of cached lookups
 * and keeps working even if a model name itself contains "vs".
 */
async function resolvePair(rawSegment: string): Promise<[LaptopDetail, LaptopDetail] | null> {
  const raw = decodeURIComponent(rawSegment)
  const candidates: Array<[string, string]> = []
  for (let i = raw.indexOf("-vs-"); i !== -1; i = raw.indexOf("-vs-", i + 1)) {
    candidates.push([raw.slice(0, i), raw.slice(i + 4)])
  }
  for (const [left, right] of candidates) {
    if (!left || !right) continue
    const [a, b] = await Promise.all([resolveOne(left), resolveOne(right)])
    if (a && b && a.id !== b.id) return [a, b]
  }
  return null
}

// Slug order is canonical (alphabetical) so /compare/a-vs-b and /compare/b-vs-a
// share one canonical URL instead of competing as duplicates. Shares the exact
// helper the sitemap uses, so emitted URLs always match the route's canonical.
function canonicalPath(a: LaptopDetail, b: LaptopDetail): string {
  const seg = (l: LaptopDetail) => l.slug ?? encodeURIComponent(l.id)
  return canonicalComparisonPath(seg(a), seg(b))
}

interface CompareOffer {
  price: number
  currency: string
  url: string | null
  affiliateUrl: string | null
  inStock: boolean
  validUntil: Date | string | null
}

/** Cheapest current offer for the visitor's region (never another region's price). */
function regionBestOffer(l: LaptopDetail, region: string): { best: CompareOffer | null, stale: boolean } {
  const rows: CompareOffer[] = l.prices
    .filter((p: PriceEntry) => p.region === region)
    .map((p: PriceEntry) => ({
      price: p.price,
      currency: p.currency,
      url: p.url,
      affiliateUrl: p.affiliateUrl,
      inStock: p.inStock !== false,
      validUntil: p.validUntil ?? null,
    }))
  const { best, stale } = pickBestOffer(rows)
  return { best, stale }
}

function priceLabel(offer: CompareOffer | null): string {
  if (!offer) return "Price unavailable"
  return formatPrice(offer.price, offer.currency)
}

/** "United States" -> "the United States" (keeps the summary grammatical). */
function regionPhrase(code: string): string {
  const label = getRegion(code).label
  return label.startsWith("United") ? `the ${label}` : label
}

// ── GEO summary (2 factual sentences for AI crawlers to cite) ──────────────

function geoSummary(
  a: LaptopDetail,
  b: LaptopDetail,
  regionLabel: string,
  priceA: string,
  priceB: string
): string {
  const hardware = (l: LaptopDetail) => {
    const cpu = [l.cpuBrand, l.cpuFamily, l.cpuGeneration].filter(Boolean).join(" ") || "an unlisted processor"
    const gpu =
      l.gpuType.toLowerCase() === "integrated"
        ? "integrated graphics"
        : `a dedicated ${l.gpuModel ?? "GPU"}`
    return `a ${l.displaySize}-inch ${l.os} laptop on ${cpu} with ${gpu}`
  }
  const endurance = (l: LaptopDetail) => {
    const battery = l.batteryLife != null ? `${l.batteryLife} hours of battery life` : "unlisted battery life"
    const weight = l.weight != null ? `${l.weight} kg` : "an unlisted weight"
    return `${battery}, ${weight}, and a ${l.displayRefreshRate} Hz display`
  }

  const s1 = `The ${nameOf(a)} is ${hardware(a)}, while the ${nameOf(b)} is ${hardware(b)}.`
  const s2 = `In ${regionLabel}, the ${shortName(a)} is priced from ${priceA} versus ${priceB} for the ${shortName(b)}; the ${shortName(a)} lists ${endurance(a)} against ${endurance(b)} for the ${shortName(b)}.`
  return `${s1} ${s2}`
}

// ── Structured data ────────────────────────────────────────────────────────

interface AggregateRating {
  "@type": "AggregateRating"
  ratingValue: number
  bestRating: number
  worstRating: number
}

interface ProductNode {
  "@type": "Product"
  name: string
  sku: string
  brand: { "@type": "Brand"; name: string }
  description: string
  url: string
  image?: string
  offers?: {
    "@type": "Offer"
    priceCurrency: string
    price: number
    availability: string
  }
  aggregateRating?: AggregateRating
}

/**
 * One Product per device, each with an AggregateRating when the catalog has a
 * review score. ratingCount/reviewCount are intentionally omitted — the catalog
 * holds no review volume, and fabricating one would be a lie in structured data.
 */
function productNode(l: LaptopDetail, region: string): ProductNode {
  const { best } = regionBestOffer(l, region)
  return {
    "@type": "Product",
    name: nameOf(l),
    sku: l.id,
    brand: { "@type": "Brand", name: l.brand },
    description: `Specs: ${specSummary(l)}.`,
    url: new URL(`/laptops/${l.slug ?? encodeURIComponent(l.id)}`, BASE_URL).toString(),
    ...(l.imageUrl ? { image: l.imageUrl } : {}),
    ...(best
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: best.currency,
            price: best.price,
            availability: best.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {}),
    ...(l.reviewScore != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: l.reviewScore,
            bestRating: 10,
            worstRating: 0,
          },
        }
      : {}),
  }
}

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: ComparePageProps): Promise<Metadata> {
  const { slugs } = await params
  const pair = await resolvePair(slugs)
  if (!pair) return { title: "Comparison not found — SpecWise" }
  const [a, b] = pair

  const title = `${nameOf(a)} vs ${nameOf(b)} — SpecWise`
  const description = `${nameOf(a)} vs ${nameOf(b)}: side-by-side specs, prices, battery, and display compared to help you pick the right laptop.`
  const canonical = canonicalPath(a, b)
  // Non-canonical order (b-vs-a) 308s to the canonical order — same
  // precedent as the detail route's legacy-id redirect (single canonical URL
  // per pair, no duplicate-URL debt from selection affordances).
  if (`/compare/${slugs}` !== canonical) permanentRedirect(canonical)
  const image = a.imageUrl ?? b.imageUrl

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      siteName: "SpecWise",
      title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image, alt: `${nameOf(a)} vs ${nameOf(b)}` }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

// ── Spec rows ──────────────────────────────────────────────────────────────
// Row definitions live in the shared module both compare routes import
// (`@/components/compare/compare-rows`) — factual catalog projections, no
// scoring. This route keeps exactly-2 semantics over the same rows.

// ── Page ───────────────────────────────────────────────────────────────────

export default async function CompareSlugsPage({ params }: ComparePageProps) {
  const { slugs } = await params
  const pair = await resolvePair(slugs)
  if (!pair) notFound()
  const [a, b] = pair

  const region = await getRegionFromCookies()
  // Canonical 308 (body fallback — metadata fires pre-stream; see above).
  if (`/compare/${slugs}` !== canonicalPath(a, b)) permanentRedirect(canonicalPath(a, b))
  const { best: offerA, stale: staleA } = regionBestOffer(a, region.code)
  const { best: offerB, stale: staleB } = regionBestOffer(b, region.code)
  const summary = geoSummary(a, b, regionPhrase(region.code), priceLabel(offerA), priceLabel(offerB))

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [productNode(a, region.code), productNode(b, region.code)],
  }

  const laptops = [a, b]
  const offerById = new Map([
    [a.id, { best: offerA, stale: staleA }],
    [b.id, { best: offerB, stale: staleB }],
  ])
  const columns: CompareTableColumn[] = laptops.map(l => {
    const entry = offerById.get(l.id)
    return {
      id: l.id,
      brand: l.brand,
      model: l.model,
      variant: l.variant,
      imageUrl: l.imageUrl,
      detailHref: `/laptops/${l.slug ?? encodeURIComponent(l.id)}`,
      priceLabel: priceLabel(entry?.best ?? null),
      priceStale: entry?.stale ?? false,
      buyHref: entry?.best?.affiliateUrl ?? entry?.best?.url ?? null,
    }
  })
  const { rows, hiddenCount } = visibleCompareRows(laptops)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/laptops"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
          Side-by-side comparison
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
          {nameOf(a)} <span className="text-muted">vs</span> {nameOf(b)}
        </h1>
      </header>

      {/* GEO summary — factual 2-sentence block for AI answer engines */}
      <section
        aria-label="Quick comparison summary"
        className="mb-8 rounded border border-accent/30 bg-accent/5 p-4 sm:p-5"
      >
        <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
          Quick comparison
        </h2>
        <p className="text-sm leading-relaxed text-foreground">{summary}</p>
      </section>

      {/* Stored personalization (bound results only, display-only) */}
      <ComparePersonalization ids={laptops.map(l => l.id)} />

      {/* Shared comparison table (same rows as /compare) */}
      <CompareTable
        columns={columns}
        rows={rows}
        hiddenCount={hiddenCount}
        ids={laptops.map(l => l.id)}
        allowRemove={false}
      />

      <p className="mt-6 text-xs text-muted">
        Prices shown for {regionPhrase(region.code)}. Run the{" "}
        <Link href="/quiz" className="text-accent transition hover:underline">
          laptop quiz
        </Link>{" "}
        to see which of these fits your workload.
      </p>
    </div>
  )
}
