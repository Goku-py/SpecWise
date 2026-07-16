import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as fs from "fs"
import * as path from "path"
import "dotenv/config"
import { REGIONS } from "../src/lib/regions"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

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
  isActive?: boolean; isPopular: boolean; imageUrl?: string; reviewScore?: number; notes?: string
  /** Real regional prices from PricesAPI (fetched by scripts/fetch-laptops.ts) */
  pricesOverride?: Array<{
    region: string; retailer: string; currency: string; price: number; url: string | null; affiliateUrl: string | null
  }>
  [key: string]: unknown
}

async function seedLaptops() {
  const filePath = path.join(__dirname, "..", "data", "laptops.json")
  const raw = fs.readFileSync(filePath, "utf-8")
  const laptops: SeedLaptop[] = JSON.parse(raw)

  console.log(`Seeding ${laptops.length} laptops with regional prices...`)

  for (const lap of laptops) {
    const id = `${lap.brand}-${lap.model}-${(lap.variant || "").replace(/\s+/g, "-")}-${lap.region}`

    await prisma.laptop.upsert({
      where: { id },
      update: {
        isPopular: lap.isPopular,
        notes: lap.notes || null,
      },
      create: {
        id,
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

    // Use PricesAPI data if available, otherwise generate from fx rates
    const prices = lap.pricesOverride ?? generatePrices(lap.price, lap.url, lap.affiliateUrl)
    for (const p of prices) {
      await prisma.laptopPrice.upsert({
        where: { laptopId_region_retailer: { laptopId: id, region: p.region, retailer: p.retailer } },
        update: { price: p.price, currency: p.currency, url: p.url, affiliateUrl: p.affiliateUrl },
        create: { laptopId: id, ...p },
      })
    }

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
      const data: any = await res.json()
      if (!data.results?.length) { console.warn(`  No results for ${l.brand} ${l.model}`); continue }
      const imgUrl = data.results[0].urls.small
      await prisma.laptop.update({ where: { id: l.id }, data: { imageUrl: imgUrl } })
      console.log(`  ✓ ${l.brand} ${l.model}`)
    } catch (e) {
      console.warn(`  ✗ ${l.brand} ${l.model}:`, e)
    }
  }
}

async function main() {
  console.log("🌱 Starting seed...\n")

  // Clear existing data
  await prisma.laptopPrice.deleteMany()
  await prisma.laptop.deleteMany()

  await seedLaptops()
  await invalidateCatalogCacheAfterSeed()
  console.log()
  await fetchUnsplashImages()
  console.log("\n✅ Seed complete!")
}

main()
  .catch(e => { console.error("Seed error:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
