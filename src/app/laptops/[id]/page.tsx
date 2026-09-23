import type { Metadata } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import { notFound, permanentRedirect } from "next/navigation"
import {
  ArrowLeft,
  Cpu,
  Monitor,
  MemoryStick,
  Weight,
  Battery,
  Usb,
  Star,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { buildAffiliateUrl } from "@/lib/affiliate"
import { ProductImage } from "@/components/ui/product-image"
import {
  DetailPriceLine,
  DetailPricingTable,
  type DetailPriceRow,
} from "@/components/product/detail-pricing"
import { getActiveCatalog, getLaptopById, getLaptopBySlug } from "@/lib/catalog-cache"
import { canonicalComparisonPath } from "@/lib/compare-pairs"
import { normalizeRegion } from "@/lib/regions"
import { REGION_COOKIE } from "@/proxy"
import { ExplorerWrapper } from "@/components/laptop/explorer-wrapper"
import type { LaptopDetail, PriceEntry } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const dynamicParams = true

// Force dynamic: the page passes all region prices to the client, which
// filters by the region cookie client-side. Making this dynamic ensures
// fresh server-rendered metadata and JSON-LD on every request.
export const dynamic = "force-dynamic"

export async function generateStaticParams() {
  const catalog = await getActiveCatalog("US")
  // Phase 2a: slugs are the URL identity. Fall back to the (encoded) legacy id
  // only for rows whose slug hasn't been backfilled yet.
  return catalog.map(l => ({ id: l.slug ?? l.id }))
}

// Phase 2a: a URL segment may be a slug OR a legacy id (contains spaces, possibly
// %20-encoded). Next.js passes the raw (still percent-encoded) segment, so decode
// once, then look up by slug first and by legacy id second.
async function resolveLaptop(rawSegment: string) {
  const id = decodeURIComponent(rawSegment)
  const bySlug = await getLaptopBySlug(id)
  if (bySlug) return { laptop: bySlug, matchedLegacyId: false }
  const byId = await getLaptopById(id)
  return { laptop: byId, matchedLegacyId: true }
}

/**
 * Phase 3: old slug -> current slug URL path, or null. Single hop straight
 * to the laptop's CURRENT slug, so stale chains can never cycle.
 */
async function findSlugRedirectTarget(rawId: string): Promise<string | null> {
  const redirect = await prisma.slugRedirect.findUnique({
    where: { from: decodeURIComponent(rawId) },
    include: { laptop: { select: { slug: true, id: true } } },
  })
  if (!redirect) return null
  return `/laptops/${redirect.laptop.slug ?? redirect.laptop.id}`
}

function specSummary(laptop: LaptopDetail): string {
  const parts = [
    laptop.displaySize ? `${laptop.displaySize}" display` : null,
    laptop.displayResolution,
    laptop.cpuFamily ? `${laptop.cpuBrand} ${laptop.cpuFamily}` : null,
    laptop.ramAmount ? `${laptop.ramAmount} GB RAM` : null,
    laptop.storageAmount ? `${laptop.storageAmount} GB ${laptop.storageType}` : null,
  ]
  return parts.filter(Boolean).join(", ")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: rawId } = await params
  // Redirects fire here (pre-stream) so stale URLs answer with a real HTTP
  // 308. Redirects thrown from the page body degrade to 200 + client-side
  // navigation once loading.tsx has streamed (verified 2026-09-22); the body
  // keeps the same checks as fallback.
  const { laptop, matchedLegacyId } = await resolveLaptop(rawId)
  if (!laptop) {
    const target = await findSlugRedirectTarget(rawId)
    if (target) permanentRedirect(target)
    return { title: "Laptop not found" }
  }
  if (matchedLegacyId && laptop.slug) permanentRedirect(`/laptops/${laptop.slug}`)

  const title = `${laptop.brand} ${laptop.model}${laptop.variant ? ` (${laptop.variant})` : ""}`
  const specs = specSummary(laptop)

  return {
    title: `${title} — SpecWise`,
    description: `${title} specs: ${specs}. Compare prices across retailers and find the best deal.`,
  }
}

interface ProductJsonLd {
  "@context": string
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
    priceValidUntil?: string
  }
}

/** Phase 3: an offer counts as current when in stock and unexpired. */
function isCurrentOffer(
  p: Pick<PriceEntry, "inStock" | "validUntil">,
  now: number
): boolean {
  if (p.inStock === false) return false
  if (p.validUntil == null) return true
  return new Date(p.validUntil).getTime() > now
}

// Phase 3, region-consistent: JSON-LD is built from the SAME region-filtered
// rows the visible UI prices (DetailPricingTable filters by cookie region
// client-side). Never lowest-across-regions, never hardcoded availability.
function buildProductJsonLd(laptop: LaptopDetail, region: string): ProductJsonLd {
  const now = Date.now()
  const regional = laptop.prices.filter(p => p.region === region)
  const current = regional.filter(p => isCurrentOffer(p, now))
  // Prefer the cheapest current offer; fall back to the cheapest regional row
  // with explicit (possibly out-of-stock) availability. No regional rows at
  // all: omit offers rather than borrowing another region's price.
  const pick =
    (current.length > 0 ? current : regional)
      .reduce<PriceEntry | null>(
        (min, p) => (min === null || p.price < min.price ? p : min),
        null
      )
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${laptop.brand} ${laptop.model}${laptop.variant ? ` (${laptop.variant})` : ""}`,
    sku: laptop.id,
    brand: { "@type": "Brand", name: laptop.brand },
    description: `Specs: ${specSummary(laptop)}.`,
    // Phase 2a: canonical URL uses the slug (no encoding needed); fall back to
    // the encoded legacy id only if the slug was never backfilled.
    url: new URL(`/laptops/${laptop.slug ?? encodeURIComponent(laptop.id)}`, BASE_URL).toString(),
    ...(laptop.imageUrl ? { image: laptop.imageUrl } : {}),
    ...(pick
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: pick.currency,
            price: pick.price,
            availability:
              pick.inStock === false
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
            ...(pick.validUntil
              ? { priceValidUntil: new Date(pick.validUntil).toISOString().slice(0, 10) }
              : {}),
          },
        }
      : {}),
  }
}

interface RivalRow {
  id: string
  slug: string | null
  brand: string
  model: string
  displaySize: number
  gpuType: string
}

/**
 * Internal-linking hierarchy: the most similar active laptops (same graphics
 * class first, then closest screen size). Returns rows that have a slug, so
 * every link maps to a canonical /compare/<a>-vs-<b> route.
 */
function pickRivals(
  current: LaptopDetail,
  rows: RivalRow[],
  limit = 3
): Array<RivalRow & { slug: string }> {
  const sameGpu = (gpuType: string) => gpuType.toLowerCase() === current.gpuType.toLowerCase()
  const rank = (row: RivalRow) =>
    (sameGpu(row.gpuType) ? 2 : 0) - Math.abs(row.displaySize - current.displaySize)
  return rows
    .filter((row): row is RivalRow & { slug: string } => Boolean(row.slug) && row.id !== current.id)
    .sort((a, b) => rank(b) - rank(a) || a.model.localeCompare(b.model))
    .slice(0, limit)
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="font-mono text-right text-xs font-medium text-foreground">{children}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in rounded border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  )
}

export default async function LaptopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
  const { laptop: raw, matchedLegacyId } = await resolveLaptop(rawId)
  if (!raw) {
    // Fallback duplicate of the metadata redirect (see above).
    const target = await findSlugRedirectTarget(rawId)
    if (target) permanentRedirect(target)
    notFound()
  }
  // Legacy-id hit with a slug available: 308-permanent redirect to the new URL
  // identity so search engines converge on one canonical URL (permanentRedirect
  // serves HTTP 308 in Server Components).
  if (matchedLegacyId && raw.slug) permanentRedirect(`/laptops/${raw.slug}`)
  const laptop: LaptopDetail = raw
  // Phase 3: the request region drives JSON-LD so structured data prices the
  // same region the visible UI prices (DetailPricingTable filters by cookie).
  const cookieStore = await cookies()
  const region = normalizeRegion(cookieStore.get(REGION_COOKIE)?.value) ?? "US"

  // Phase 2c: resolve each retailer row's purchase href server-side. Retailer
  // master data is fetched once per render (6 rows, cheap); the href chain is
  // affiliateUrl → per-retailer quirk → linkTemplate → url (all templates are
  // NULL today, so rows without url/affiliateUrl resolve to null → no link,
  // exactly as before). BuyButton renders nothing for null hrefs.
  const retailerRefs = new Map<string, { code: string; linkTemplate: string | null }>()
  const buyHrefs = new Map<string, string>()
  if (laptop.prices.length > 0) {
    const retailers = await prisma.retailer.findMany({
      select: { code: true, name: true, linkTemplate: true },
    })
    for (const r of retailers) {
      retailerRefs.set(r.name, r)
      retailerRefs.set(r.code, r)
    }
    for (const p of laptop.prices) {
      const ref = retailerRefs.get(p.retailer)
      const href = buildAffiliateUrl({
        affiliateUrl: p.affiliateUrl,
        linkTemplate: ref?.linkTemplate ?? null,
        url: p.url,
        retailer: ref?.code ?? null,
        vars: { model: laptop.model },
      })
      if (href) buyHrefs.set(`${p.retailer}-${p.region}`, href)
    }
  }

  // Region-aware pricing rows: the client DetailPricing components filter
  // these by the visitor's region (cookie) and format every price in that
  // region's currency — never a mix (Phase: region/currency consistency).
  const priceRows: DetailPriceRow[] = laptop.prices.map(p => ({
    retailer: p.retailer,
    region: p.region,
    currency: p.currency,
    price: p.price,
    url: p.url,
    affiliateUrl: p.affiliateUrl,
    href: buyHrefs.get(`${p.retailer}-${p.region}`) ?? null,
  }))

  // Internal linking for the programmatic comparison routes: pick similar
  // active laptops and link to their canonical /compare/<a>-vs-<b> pages.
  const currentSlug = laptop.slug
  const rivalRows = currentSlug
    ? await prisma.laptop.findMany({
        where: { status: "active", id: { not: laptop.id } },
        select: { id: true, slug: true, brand: true, model: true, displaySize: true, gpuType: true },
        take: 60,
      })
    : []
  const comparisonLinks = currentSlug
    ? pickRivals(laptop, rivalRows).map(r => ({
        id: r.id,
        href: canonicalComparisonPath(currentSlug, r.slug),
        label: `${r.brand} ${r.model}`,
      }))
    : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(laptop, region)) }}
      />
      {/* Back link */}
      <Link
        href="/laptops"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {laptop.brand} {laptop.model}
              {laptop.variant && <span className="text-muted"> ({laptop.variant})</span>}
            </h1>
            <p className="mt-1 text-sm text-muted">{laptop.os}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {laptop.isPopular && (
              <span className="rounded bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                Popular
              </span>
            )}
            {laptop.reviewScore != null && (
              <span className="flex items-center gap-1 rounded bg-card-hover px-3 py-1 text-xs font-medium text-foreground">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                {laptop.reviewScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {/* Price range — always the selected region's currency */}
        <DetailPriceLine rows={priceRows} />
        {laptop.isRefurbished && (
          <p className="mt-1 text-xs text-amber-500">Refurbished model</p>
        )}
      </div>

      {/* Image — LCP element, so mark priority (never lazy) */}
      <div className="mb-8 flex items-center justify-center rounded border border-border bg-card p-8">
        <ProductImage
          src={laptop.imageUrl}
          alt={`${laptop.brand} ${laptop.model}`}
          width={400}
          height={256}
          priority
          className="max-h-64 object-contain"
        />
      </div>

      {/* Hardware Explorer — lazy client island */}
      <div className="mb-8">
        <ExplorerWrapper laptop={laptop} />
      </div>

      {/* Spec sections grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Overview */}
        <Section title="Overview" icon={Monitor}>
          <SpecRow label="Brand">{laptop.brand}</SpecRow>
          <SpecRow label="Model">{laptop.model}</SpecRow>
          <SpecRow label="OS">{laptop.os}</SpecRow>
          {laptop.notes && <SpecRow label="Notes">{laptop.notes}</SpecRow>}
        </Section>

        {/* Processor */}
        <Section title="Processor" icon={Cpu}>
          <SpecRow label="Brand">{laptop.cpuBrand}</SpecRow>
          <SpecRow label="Family">{laptop.cpuFamily}</SpecRow>
          {laptop.cpuGeneration && <SpecRow label="Generation">{laptop.cpuGeneration}</SpecRow>}
          {laptop.cpuCores != null && <SpecRow label="Cores">{laptop.cpuCores}</SpecRow>}
          {laptop.cpuBenchmark != null && <SpecRow label="Benchmark">{laptop.cpuBenchmark.toLocaleString()}</SpecRow>}
        </Section>

        {/* Graphics */}
        <Section title="Graphics" icon={Monitor}>
          <SpecRow label="Type">{laptop.gpuType}</SpecRow>
          {laptop.gpuModel && <SpecRow label="Model">{laptop.gpuModel}</SpecRow>}
          {laptop.gpuVRAM != null && <SpecRow label="VRAM">{laptop.gpuVRAM} GB</SpecRow>}
        </Section>

        {/* Memory & Storage */}
        <Section title="Memory & Storage" icon={MemoryStick}>
          <SpecRow label="RAM">{laptop.ramAmount} GB{laptop.ramType ? ` ${laptop.ramType}` : ""}</SpecRow>
          <SpecRow label="Upgradeable">{laptop.ramUpgradeable ? "Yes" : "No"}</SpecRow>
          <SpecRow label="Storage">{laptop.storageAmount} GB {laptop.storageType}</SpecRow>
          <SpecRow label="Expandable">{laptop.storageExpandable ? "Yes" : "No"}</SpecRow>
        </Section>

        {/* Display */}
        <Section title="Display" icon={Monitor}>
          <SpecRow label="Size">{laptop.displaySize}{'"'}</SpecRow>
          {laptop.displayResolution && <SpecRow label="Resolution">{laptop.displayResolution}</SpecRow>}
          <SpecRow label="Refresh Rate">{laptop.displayRefreshRate} Hz</SpecRow>
          {laptop.displayPanelType && <SpecRow label="Panel Type">{laptop.displayPanelType}</SpecRow>}
          {laptop.displayBrightness != null && <SpecRow label="Brightness">{laptop.displayBrightness} nits</SpecRow>}
          {laptop.displayColorGamut && <SpecRow label="Color Gamut">{laptop.displayColorGamut}</SpecRow>}
          <SpecRow label="Touch">{laptop.displayTouch || laptop.isTouchscreen ? "Yes" : "No"}</SpecRow>
        </Section>

        {/* Ports & Connectivity */}
        <Section title="Ports & Connectivity" icon={Usb}>
          {laptop.ports.length > 0 && (
            <SpecRow label="Ports">{laptop.ports.join(", ")}</SpecRow>
          )}
          {laptop.wireless && <SpecRow label="Wireless">{laptop.wireless}</SpecRow>}
        </Section>

        {/* Physical */}
        <Section title="Physical" icon={Weight}>
          {laptop.weight != null && <SpecRow label="Weight">{laptop.weight} kg</SpecRow>}
          {laptop.buildMaterial && <SpecRow label="Material">{laptop.buildMaterial}</SpecRow>}
          {laptop.webcamQuality && <SpecRow label="Webcam">{laptop.webcamQuality}</SpecRow>}
          <SpecRow label="Keyboard Backlit">{laptop.keyboardBacklit ? "Yes" : "No"}</SpecRow>
          {laptop.securityFeatures.length > 0 && (
            <SpecRow label="Security">{laptop.securityFeatures.join(", ")}</SpecRow>
          )}
        </Section>

        {/* Battery */}
        <Section title="Battery" icon={Battery}>
          {laptop.batteryCapacity != null && <SpecRow label="Capacity">{laptop.batteryCapacity} Wh</SpecRow>}
          {laptop.batteryLife != null && <SpecRow label="Battery Life">{laptop.batteryLife} hours</SpecRow>}
        </Section>
      </div>

      {/* Pricing by retailer — scoped to the visitor's selected region */}
      <DetailPricingTable rows={priceRows} />

      {/* Internal linking into the programmatic comparison routes */}
      {comparisonLinks.length > 0 && (
        <section
          aria-labelledby="compare-similar-devices"
          className="mt-8 animate-fade-in rounded border border-border bg-card p-5 sm:p-6"
        >
          <h2 id="compare-similar-devices" className="mb-1 text-base font-semibold text-foreground">
            Compare with similar devices
          </h2>
          <p className="mb-4 text-xs text-muted">
            Side-by-side specs, battery, and regional prices.
          </p>
          <ul className="space-y-2">
            {comparisonLinks.map(r => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  className="text-sm text-accent transition hover:underline"
                >
                  {laptop.brand} {laptop.model} vs {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
