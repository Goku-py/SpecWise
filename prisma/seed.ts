import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as fs from "fs"
import * as path from "path"
import "dotenv/config"
import { REGIONS } from "../src/lib/regions"
import { slugify, uniqueSlug, deterministicLaptopId } from "../src/lib/slug"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ── Phase 2a/b: slugify + uniqueness ───────────────────────────────────────
// Shared with the write layer (src/lib/slug.ts, imported by src/lib/db/catalog.ts)
// so the seed and every runtime writer apply IDENTICAL slug rules. Slugs are NOT
// unique in the DB (deliberate, low-risk choice — see schema.prisma comment);
// uniqueness is enforced here in the write layer: on collision we append
// -2, -3, ... until the slug is free. uniqueSlug() is pure — the caller records
// the result in `used` so later collisions see it.

// ── Phase 2a: Brand master data (upserted, idempotent) ─────────────────────
const BRAND_NAMES = ["Acer", "Apple", "ASUS", "Dell", "HP", "Lenovo", "Microsoft", "MSI", "Razer", "Samsung"]

async function upsertBrands(): Promise<Map<string, string>> {
  // Map from brand display name -> Brand.id
  const byName = new Map<string, string>()
  for (const name of BRAND_NAMES) {
    const brand = await prisma.brand.upsert({
      where: { name },
      update: { slug: slugify(name) },
      create: { name, slug: slugify(name), logoUrl: null },
    })
    byName.set(name, brand.id)
  }
  return byName
}

// ── Phase 2a: Retailer master data ──────────────────────────────────────────
// Exactly the retailer names used per region in src/lib/regions.ts. baseUrl is a
// conservative home-domain default (Amazon uses the .com global storefront; the
// regional storefronts live under the same brand). linkTemplate/affiliateProgram
// intentionally left null — do NOT invent affiliate config.
const RETAILERS = [
  { code: "amazon", name: "Amazon", baseUrl: "https://www.amazon.com" },
  { code: "best-buy", name: "Best Buy", baseUrl: "https://www.bestbuy.com" },
  { code: "flipkart", name: "Flipkart", baseUrl: "https://www.flipkart.com" },
  { code: "currys", name: "Currys", baseUrl: "https://www.currys.co.uk" },
  { code: "mediamarkt", name: "MediaMarkt", baseUrl: "https://www.mediamarkt.de" },
  { code: "jb-hi-fi", name: "JB Hi-Fi", baseUrl: "https://www.jbhifi.com.au" },
]

async function upsertRetailers() {
  for (const r of RETAILERS) {
    await prisma.retailer.upsert({
      where: { code: r.code },
      update: { name: r.name, baseUrl: r.baseUrl },
      create: { ...r, linkTemplate: null, affiliateProgram: null, enabled: true },
    })
  }
}

// ponytail: one Amazon + one regional placeholder per region; 2nd retailer gets a small
// price variance so the "best deal" pick is real. Swap names/affiliate links later.
const REGION_CONFIG: Record<string, { currency: string; fx: number; retailers: string[] }> =
  Object.fromEntries(
    REGIONS.map(r => [r.code, { currency: r.currency, fx: r.fx, retailers: r.retailers }])
  )

function generatePrices(usdPrice: number, url?: string, affiliateUrl?: string) {
  const out: { region: string; retailer: string; currency: string; price: number; url: string | null; affiliateUrl: string | null }[] = []
  for (const [region, cfg] of Object.entries(REGION_CONFIG)) {
    const base = Math.round(usdPrice * cfg.fx)
    cfg.retailers.forEach((retailer, i) => {
      const variance = i === 0 ? 0 : (base % 2 === 0 ? 1 : -1) * Math.max(1, Math.round(base * 0.04))
      out.push({
        region,
        retailer,
        currency: cfg.currency,
        price: base + variance,
        url: url || null,
        affiliateUrl: affiliateUrl || null,
      })
    })
  }
  return out
}

interface SeedLaptop {
  brand: string; model: string; variant: string | null
  price: number; currency: string; region: string; url?: string; affiliateUrl?: string
  os: string; cpuBrand: string; cpuFamily: string; cpuGeneration?: string
  cpuCores?: number; gpuType: string; gpuModel?: string; gpuVRAM?: number
  ramAmount: number; ramType?: string; ramUpgradeable: boolean
  storageAmount: number; storageType: string; storageExpandable: boolean
  displaySize: number; displayResolution?: string; displayRefreshRate: number
  displayPanelType?: string; displayBrightness?: number; displayColorGamut?: string
  displayTouch?: boolean; batteryCapacity?: number; batteryLife?: number
  weight?: number; buildMaterial?: string; webcamQuality?: string
  ports: string[]; wireless?: string; securityFeatures: string[]
  keyboardBacklit: boolean; isTouchscreen: boolean; isRefurbished?: boolean
  // Legacy field, kept for data-file compat: isActive=false maps to status='archived',
  // anything else (incl. undefined) maps to status='active' (phase 2a).
  isActive?: boolean; isPopular: boolean; imageUrl?: string; reviewScore?: number; notes?: string
  /** Real regional prices from PricesAPI (fetched by scripts/fetch-laptops.ts) */
  pricesOverride?: Array<{
    region: string; retailer: string; currency: string; price: number; url: string | null; affiliateUrl: string | null
  }>
  [key: string]: unknown
}

/**
 * Phase 3: fail-fast row validation (runs before ANY write, including dry-run).
 * Returns human-readable errors; empty means valid.
 */
function validateSeedRow(lap: SeedLaptop, index: number): string[] {
  void index
  const errs: string[] = []
  if (!lap.brand || !lap.model) errs.push("brand/model required")
  if (!Number.isFinite(lap.price) || lap.price < 0) errs.push("price must be a finite number >= 0")
  if (!Number.isFinite(lap.ramAmount) || !Number.isFinite(lap.storageAmount)) errs.push("ramAmount/storageAmount must be finite")
  if (!Number.isFinite(lap.displaySize)) errs.push("displaySize must be finite")
  if (!Array.isArray(lap.ports) || !Array.isArray(lap.securityFeatures)) errs.push("ports/securityFeatures must be arrays")
  for (const p of lap.pricesOverride ?? []) {
    if (!p.region || !p.retailer || !Number.isFinite(p.price) || p.price < 0) {
      errs.push(`pricesOverride has an invalid entry (region ${String(p.region)})`)
      break
    }
  }
  return errs
}

/** Read + validate the data file. Throws before any write on invalid rows. */
function loadSeedRows(): SeedLaptop[] {
  const filePath = path.join(__dirname, "..", "data", "laptops.json")
  const laptops: SeedLaptop[] = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  const errors: string[] = []
  laptops.forEach((lap, i) => {
    for (const e of validateSeedRow(lap, i)) errors.push(`row ${i}: ${e}`)
  })
  if (errors.length > 0) throw new Error(`Seed validation failed:\n${errors.join("\n")}`)
  return laptops
}

async function seedLaptops(brandIds: Map<string, string>) {
  // Validated up front: invalid rows abort before any write.
  const laptops = loadSeedRows()

  console.log(`Seeding ${laptops.length} laptops with regional prices...`)

  const usedSlugs = new Set<string>()
  for (const lap of laptops) {
    // Deterministic ID: Brand-Model-Variant (variant optional). The data file has no
    // per-laptop region field — region used to be interpolated here, yielding "-undefined"
    // suffixes that broke URLs/canonicals. IDs stay as the legacy identity; slugs are
    // now the URL identity (phase 2a).
    const id = deterministicLaptopId(lap.brand, lap.model, lap.variant)

    const slug = uniqueSlug(
      slugify(`${lap.brand}-${lap.model}-${lap.variant || ""}`),
      usedSlugs
    )
    usedSlugs.add(slug)
    // Legacy isActive field (if ever present in data) maps to status; default active.
    const status = lap.isActive === false ? "archived" : "active"

    // Phase 3: each laptop + its prices commit atomically; a renamed slug
    // keeps a 308 trail. Re-running the seed repairs partial rows (upserts).
    // Use PricesAPI data if available, otherwise generate from fx rates
    const prices = lap.pricesOverride ?? generatePrices(lap.price, lap.url, lap.affiliateUrl)
    await prisma.$transaction(async tx => {
      const existing = await tx.laptop.findUnique({ where: { id }, select: { slug: true } })
      await tx.laptop.upsert({
        where: { id },
        update: {
          slug,
          brandId: brandIds.get(lap.brand) ?? null,
          isPopular: lap.isPopular,
          notes: lap.notes || null,
          dataSource: "seed",
          sourceUpdatedAt: new Date(),
        },
      create: {
        id,
        slug,
        brandId: brandIds.get(lap.brand) ?? null,
        status,
        dataSource: "seed",
        sourceUpdatedAt: new Date(),
        brand: lap.brand,
        model: lap.model,
        variant: lap.variant || null,
        os: lap.os,
        cpuBrand: lap.cpuBrand,
        cpuFamily: lap.cpuFamily,
        cpuGeneration: lap.cpuGeneration || null,
        cpuCores: lap.cpuCores || null,
        gpuType: lap.gpuType,
        gpuModel: lap.gpuModel || null,
        gpuVRAM: lap.gpuVRAM || null,
        ramAmount: lap.ramAmount,
        ramType: lap.ramType || null,
        ramUpgradeable: lap.ramUpgradeable,
        storageAmount: lap.storageAmount,
        storageType: lap.storageType,
        storageExpandable: lap.storageExpandable,
        displaySize: lap.displaySize,
        displayResolution: lap.displayResolution || null,
        displayRefreshRate: lap.displayRefreshRate,
        displayPanelType: lap.displayPanelType || null,
        displayBrightness: lap.displayBrightness || null,
        displayColorGamut: lap.displayColorGamut || null,
        displayTouch: lap.displayTouch || false,
        batteryCapacity: lap.batteryCapacity || null,
        batteryLife: lap.batteryLife || null,
        weight: lap.weight || null,
        buildMaterial: lap.buildMaterial || null,
        webcamQuality: lap.webcamQuality || null,
        ports: lap.ports,
        wireless: lap.wireless || null,
        securityFeatures: lap.securityFeatures || [],
        keyboardBacklit: lap.keyboardBacklit,
        isTouchscreen: lap.isTouchscreen,
        isRefurbished: lap.isRefurbished || false,
        isPopular: lap.isPopular,
        imageUrl: lap.imageUrl || null,
        reviewScore: lap.reviewScore || null,
        notes: lap.notes || null,
      },
    })

      for (const p of prices) {
        await tx.laptopPrice.upsert({
          where: { laptopId_region_retailer: { laptopId: id, region: p.region, retailer: p.retailer } },
          update: { price: p.price, currency: p.currency, url: p.url, affiliateUrl: p.affiliateUrl },
          create: { laptopId: id, ...p },
        })
      }
      if (existing?.slug && existing.slug !== slug) {
        await tx.slugRedirect.upsert({
          where: { from: existing.slug },
          update: { laptopId: id },
          create: { from: existing.slug, laptopId: id },
        })
      }
    })

    console.log(`  ✓ ${lap.brand} ${lap.model} — ${prices.length} region prices`)
  }
}

// ponytail: inline Unsplash fetch — reuses fetch-images.ts logic but keeps seed self-contained
async function invalidateCatalogCacheAfterSeed() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const apiKey = process.env.ADMIN_API_KEY
  if (!appUrl || !apiKey) {
    console.log("Skipping catalog cache invalidation (NEXT_PUBLIC_APP_URL or ADMIN_API_KEY not set)")
    return
  }
  try {
    const res = await fetch(`${appUrl}/api/admin/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) {
      console.log("✅ Catalog cache invalidated")
    } else {
      console.warn(`⚠️ Cache invalidation returned HTTP ${res.status}`)
    }
  } catch (e) {
    console.warn("⚠️ Failed to invalidate catalog cache:", e)
  }
}

async function fetchUnsplashImages() {
  // Phase 3: network image I/O is opt-in — core seed correctness never depends
  // on it (rows are complete with imageUrl null).
  if (process.env.SEED_FETCH_IMAGES !== "1") {
    console.log("Skipping Unsplash image fetch (SEED_FETCH_IMAGES=1 to enable)")
    return
  }
  const apiKey = process.env.UNSPLASH_ACCESS_KEY
  if (!apiKey) { console.log("Skipping Unsplash image fetch (UNSPLASH_ACCESS_KEY not set)"); return }

  const laptops = await prisma.laptop.findMany({ where: { imageUrl: null } })
  if (!laptops.length) { console.log("All laptops already have images"); return }

  console.log(`Fetching Unsplash images for ${laptops.length} laptops...`)
  for (const l of laptops) {
    const query = encodeURIComponent(`${l.brand} ${l.model} laptop`)
    const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`

    try {
      const res = await fetch(url, { headers: { Authorization: `Client-ID ${apiKey}` } })
      if (!res.ok) { console.warn(`  HTTP ${res.status} for ${l.brand} ${l.model}`); continue }
      const data = (await res.json()) as { results?: Array<{ urls: { small: string } }> }
      if (!data.results?.length) { console.warn(`  No results for ${l.brand} ${l.model}`); continue }
      const imgUrl = data.results[0].urls.small
      await prisma.laptop.update({ where: { id: l.id }, data: { imageUrl: imgUrl } })
      console.log(`  ✓ ${l.brand} ${l.model}`)
    } catch (e) {
      console.warn(`  ✗ ${l.brand} ${l.model}:`, e)
    }
  }
}

/**
 * Phase 3: dry-run diff — validates rows and reports what WOULD change
 * (creates, updates, slug collisions needing suffixes). Writes nothing.
 */
async function dryRun(): Promise<void> {
  const laptops = loadSeedRows()
  const existing = await prisma.laptop.findMany({ select: { id: true, slug: true } })
  const byId = new Map(existing.map(e => [e.id, e.slug]))
  const usedSlugs = new Set<string>()
  let creates = 0, updates = 0, suffixed = 0
  for (const lap of laptops) {
    const id = deterministicLaptopId(lap.brand, lap.model, lap.variant)
    const base = slugify(`${lap.brand}-${lap.model}-${lap.variant || ""}`)
    const slug = uniqueSlug(base, usedSlugs)
    usedSlugs.add(slug)
    if (slug !== base) suffixed++
    if (byId.has(id)) updates++
    else creates++
  }
  const prices = laptops.reduce((n, lap) => n + (lap.pricesOverride ?? generatePrices(lap.price)).length, 0)
  console.log(`DRY RUN: ${laptops.length} rows valid — ${creates} would create, ${updates} would update, ${prices} price rows, ${suffixed} slugs need suffixes.`)
}

async function main() {
  console.log("🌱 Starting seed...\n")

  // Phase 3: destructive wipe is opt-in. Default path is idempotent upserts.
  if (process.env.SEED_DRY_RUN === "1") {
    await dryRun()
    return
  }
  if (process.env.ALLOW_WIPE_SEED === "1") {
    console.log("ALLOW_WIPE_SEED=1 — clearing existing laptop/price data")
    await prisma.laptopPrice.deleteMany()
    await prisma.laptop.deleteMany()
  } else {
    console.log("Wipe skipped (set ALLOW_WIPE_SEED=1 to clear first) — upserting idempotently")
  }

  await upsertBrands().then(brands => upsertRetailers().then(() => seedLaptops(brands)))
  await invalidateCatalogCacheAfterSeed()
  console.log()
  await fetchUnsplashImages()
  console.log("\n✅ Seed complete!")
}

main()
  .catch(e => { console.error("Seed error:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
