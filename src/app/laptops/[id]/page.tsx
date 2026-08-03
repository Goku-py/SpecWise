import type { Metadata } from "next"
import Link from "next/link"
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
  // Metadata for legacy-id hits renders fine without redirecting — the body of
  // the page performs the 308 redirect to the slug URL.
  const { laptop } = await resolveLaptop(rawId)
  if (!laptop) return { title: "Laptop not found" }

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
  }
}

// Deterministic, region-agnostic (pages are statically rendered), so it must
// not read the request cookie region — prices across all regions are considered.
function buildProductJsonLd(laptop: LaptopDetail): ProductJsonLd {
  const lowestPrice = laptop.prices.reduce<PriceEntry | null>(
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
    ...(lowestPrice
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: lowestPrice.currency,
            price: lowestPrice.price,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  }
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
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
  if (!raw) notFound()
  // Legacy-id hit with a slug available: 308-permanent redirect to the new URL
  // identity so search engines converge on one canonical URL (permanentRedirect
  // serves HTTP 308 in Server Components).
  if (matchedLegacyId && raw.slug) permanentRedirect(`/laptops/${raw.slug}`)
  const laptop: LaptopDetail = raw

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(laptop)) }}
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
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                Popular
              </span>
            )}
            {laptop.reviewScore != null && (
              <span className="flex items-center gap-1 rounded-full bg-card-hover px-3 py-1 text-xs font-medium text-foreground">
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
      <div className="mb-8 flex items-center justify-center rounded-xl border border-border bg-card p-8">
        <ProductImage
          src={laptop.imageUrl}
          alt={`${laptop.brand} ${laptop.model}`}
          width={400}
          height={256}
          priority
          className="max-h-64 object-contain"
        />
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
    </div>
  )
}
