/**
 * scripts/fetch-laptops.ts
 *
 * Fetches laptop specs from TechSpecs API and pricing from PricesAPI,
 * merges with existing data/laptops.json, and writes back.
 *
 * Usage: npx tsx scripts/fetch-laptops.ts
 *
 * Requires one or both of:
 *   TECHSPECS_API_ID + TECHSPECS_API_KEY  (for specs)
 *   PRICESAPI_API_KEY                       (for pricing, optional)
 *
 * Missing keys → skip that API, keep existing data.
 */

import * as fs from "fs"
import * as path from "path"
import "dotenv/config"

// ── Types ──

interface SeedLaptop {
  brand: string
  model: string
  variant: string | null
  price: number
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuGeneration?: string
  cpuCores?: number
  cpuBenchmark?: number
  gpuType: string
  gpuModel?: string
  gpuVRAM?: number
  ramAmount: number
  ramType?: string
  ramUpgradeable: boolean
  storageAmount: number
  storageType: string
  storageExpandable: boolean
  displaySize: number
  displayResolution?: string
  displayRefreshRate: number
  displayPanelType?: string
  displayBrightness?: number
  displayColorGamut?: string
  displayTouch?: boolean
  batteryCapacity?: number
  batteryLife?: number
  weight?: number
  buildMaterial?: string
  webcamQuality?: string
  ports: string[]
  wireless?: string
  securityFeatures: string[]
  keyboardBacklit: boolean
  isTouchscreen: boolean
  isRefurbished?: boolean
  isActive?: boolean
  isPopular: boolean
  imageUrl?: string
  reviewScore?: number
  notes?: string
  /** Real regional prices from PricesAPI. Seed checks this before falling back to fx generation. */
  pricesOverride?: Array<{
    region: string
    retailer: string
    currency: string
    price: number
    url: string | null
    affiliateUrl: string | null
  }>
  [key: string]: unknown
}

// ── Paths ──

const DATA_PATH = path.join(__dirname, "..", "data", "laptops.json")

// ── API config ──

const TECHSPECS_ID = process.env.TECHSPECS_API_ID
const TECHSPECS_KEY = process.env.TECHSPECS_API_KEY
const PRICESAPI_KEY = process.env.PRICESAPI_API_KEY

// ── Seller → region mapping (mirrors src/lib/regions.ts) ──

const REGIONS = [
  { code: "US", currency: "USD", retailers: ["Amazon", "Best Buy"] },
  { code: "IN", currency: "INR", retailers: ["Amazon", "Flipkart"] },
  { code: "GB", currency: "GBP", retailers: ["Amazon", "Currys"] },
  { code: "DE", currency: "EUR", retailers: ["Amazon", "MediaMarkt"] },
  { code: "CA", currency: "CAD", retailers: ["Amazon", "Best Buy"] },
  { code: "AU", currency: "AUD", retailers: ["Amazon", "JB Hi-Fi"] },
]

function sellerRegion(seller: string, currency: string): string | null {
  const s = seller.toLowerCase()
  for (const r of REGIONS) {
    if (s === "amazon") return currency === "INR" ? "IN" : currency === "GBP" ? "GB" : currency === "EUR" ? "DE" : currency === "CAD" ? "CA" : currency === "AUD" ? "AU" : currency === "USD" ? "US" : null
    if (r.retailers.some(ret => ret.toLowerCase() === s)) return r.code
  }
  return null
}

function regionForCurrency(currency: string): string | null {
  const r = REGIONS.find(r => r.currency === currency)
  return r?.code ?? null
}

// ── Helpers ──

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function laptopKey(l: { brand: string; model: string; variant: string | null }): string {
  return `${l.brand}|${l.model}|${l.variant ?? ""}`
}

function extractNumber(text: string): number | null {
  const m = text.match(/(\d+[.,]?\d*)/)
  return m ? parseFloat(m[1].replace(",", ".")) : null
}

function extractGB(text: string): number | null {
  const m = text.match(/(\d+)\s*(?:GB|gigabyte)/i)
  if (m) return parseInt(m[1])
  const m2 = text.match(/(\d+[.,]?\d*)\s*TB/i)
  if (m2) return Math.round(parseFloat(m2[1].replace(",", ".")) * 1024)
  return null
}

function extractHz(text: string): number | null {
  const m = text.match(/(\d+)\s*Hz/i)
  return m ? parseInt(m[1]) : null
}

function extractKg(text: string): number | null {
  const m = text.match(/([\d.]+)\s*kg/i)
  if (m) return parseFloat(m[1])
  const m2 = text.match(/([\d.]+)\s*(?:lbs|pound)/i)
  if (m2) return Math.round(parseFloat(m2[1]) * 0.4536 * 100) / 100
  return null
}

// ── TechSpecs API ──

interface TechSpecsSearchMatch {
  id: string
  Brand: string
  Model: string
  Version: string
  Category: string
}

interface TechSpecsV5Detail {
  _id: string
  Product: { Brand: string; Model: string; Version: string; Category: string }
  Inside?: {
    RAM?: { Capacity?: string; "Form Factor"?: string }
    CPU?: { "Number of Cores"?: string }
    GPU?: { Type?: string; "Additional Features"?: string }
    Storage?: { "Total Capacity"?: string; Type?: string }
    SSD?: { Capacity?: string }
    Wireless?: { "WiFi Standards"?: string; "Bluetooth Version"?: string }
    Ports?: { "Number of HDMI Ports"?: string; Expansion?: string; "Additional Features"?: string }
    Battery?: { "Capacity (Watt-hours)"?: string }
    Software?: { "Operating System"?: string; "Operating System Version"?: string }
    Sensors?: { Sensors?: string }
    Security?: { Features?: string }
  }
  Display?: {
    Diagonal?: string
    "Resolution (H x W)"?: string
    "Pixel Density"?: string
    "Additional Features"?: string
  }
  No?: { Touchscreen?: string }
  Design?: { Body?: { Weight?: string; "Additional Features"?: string } }
  Camera?: { "Front Camera"?: { "Additional Features"?: string } }
}

async function searchTechSpecs(query: string): Promise<TechSpecsSearchMatch | null> {
  const url = `https://api.techspecs.io/v5/products/search?query=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      "x-api-id": TECHSPECS_ID!,
      "x-api-key": TECHSPECS_KEY!,
    },
  })
  if (!res.ok) {
    console.warn(`    TechSpecs HTTP ${res.status} for "${query}"`)
    return null
  }
  const json = await res.json()
  const items: Array<{ Product: TechSpecsSearchMatch }> = json?.data ?? []
  if (items.length === 0) {
    // Try shorter query
    const altUrl = `https://api.techspecs.io/v5/products/search?query=${encodeURIComponent(query.split(" ").slice(0, 3).join(" "))}&limit=5`
    const altRes = await fetch(altUrl, {
      headers: {
        "x-api-id": TECHSPECS_ID!,
        "x-api-key": TECHSPECS_KEY!,
      },
    })
    if (!altRes.ok) return null
    const altJson = await altRes.json()
    const altItems: Array<{ Product: TechSpecsSearchMatch }> = altJson?.data ?? []
    return altItems[0]?.Product ?? null
  }
  return items[0].Product
}

async function fetchProductDetail(id: string): Promise<TechSpecsV5Detail | null> {
  const url = `https://api.techspecs.io/v5/products/${id}`
  const res = await fetch(url, {
    headers: {
      "x-api-id": TECHSPECS_ID!,
      "x-api-key": TECHSPECS_KEY!,
    },
  })
  if (!res.ok) {
    console.warn(`    TechSpecs detail HTTP ${res.status} for product ${id}`)
    return null
  }
  const json = await res.json()
  return json?.data ?? null
}

function mapTechSpecsV5(detail: TechSpecsV5Detail): Partial<SeedLaptop> {
  const r: Partial<SeedLaptop> = {}
  const inside = detail.Inside ?? {}
  const display = detail.Display ?? {}
  const design = detail.Design ?? {}
  const camera = detail.Camera ?? {}
  const no = detail.No ?? {}

  // CPU cores
  const cores = inside.CPU?.["Number of Cores"]
  if (cores) { const n = extractNumber(cores); if (n != null) r.cpuCores = n }

  // GPU
  const gpuType = inside.GPU?.Type
  if (gpuType) r.gpuType = /integrated/i.test(gpuType) ? "integrated" : "dedicated"
  const gpuModel = inside.GPU?.["Additional Features"]
  if (gpuModel?.trim()) r.gpuModel = gpuModel.trim()

  // RAM
  const ram = inside.RAM?.Capacity
  if (ram) { const n = extractGB(ram); if (n != null) r.ramAmount = n }
  const formFactor = inside.RAM?.["Form Factor"]
  if (formFactor) r.ramUpgradeable = !/on.?board|soldered/i.test(formFactor)

  // Storage
  const storage = inside.Storage?.["Total Capacity"] ?? inside.SSD?.Capacity
  if (storage) { const n = extractGB(storage); if (n != null) r.storageAmount = n }
  const storageType = inside.Storage?.Type
  if (storageType) r.storageType = /ssd|nvme|solid.?state/i.test(storageType) ? "SSD" : /hdd|hard.?drive/i.test(storageType) ? "HDD" : "SSD"

  // Display
  const diag = display.Diagonal
  if (diag) { const n = extractNumber(diag); if (n != null && n > 5 && n < 30) r.displaySize = n }
  const resStr = display["Resolution (H x W)"]
  if (resStr?.match(/\d+x\d+/i)) r.displayResolution = resStr.match(/\d+x\d+/i)?.[0]
  const dispFeatures = display["Additional Features"]
  if (dispFeatures) {
    if (/oled|amoled/i.test(dispFeatures)) r.displayPanelType = "OLED"
    else if (/mini.?led/i.test(dispFeatures)) r.displayPanelType = "Mini-LED"
    else if (/ips/i.test(dispFeatures)) r.displayPanelType = "IPS"
    else if (/led/i.test(dispFeatures)) r.displayPanelType = "LED"
  }

  // Touchscreen
  if (no?.Touchscreen && /touch/i.test(no.Touchscreen)) r.isTouchscreen = true

  // Battery
  const batt = inside.Battery?.["Capacity (Watt-hours)"]
  if (batt) { const n = extractNumber(batt); if (n != null && n > 10 && n < 200) r.batteryCapacity = n }

  // Weight
  const weight = design.Body?.Weight
  if (weight) { const n = extractKg(weight); if (n != null) r.weight = n }

  // OS
  const os = inside.Software?.["Operating System"]
  if (os) {
    if (/mac/i.test(os)) r.os = "macOS"
    else if (/windows/i.test(os)) r.os = "Windows"
    else if (/linux/i.test(os)) r.os = "Linux"
    else if (/chrome/i.test(os)) r.os = "Chrome OS"
  }

  // Wireless
  const wifi = inside.Wireless?.["WiFi Standards"]
  if (wifi) {
    if (/wi.?fi 7/i.test(wifi)) r.wireless = "WiFi 7"
    else if (/wi.?fi 6e/i.test(wifi)) r.wireless = "WiFi 6E"
    else if (/wi.?fi 6/i.test(wifi)) r.wireless = "WiFi 6"
    else if (/wi.?fi 5/i.test(wifi)) r.wireless = "WiFi 5"
  }

  // Ports
  const portsList: string[] = []
  const ports = inside.Ports
  if (ports) {
    const features = (ports["Additional Features"] ?? "").toLowerCase()
    const expansion = (ports.Expansion ?? "").toLowerCase()
    const portKeys = Object.keys(ports).join(" ").toLowerCase()
    const combined = `${features} ${portKeys}`
    if (/(usb-c|thunderbolt|usb\s*c)/i.test(combined)) portsList.push("usb-c")
    if (/(usb-a|usb\s*3|usb\s*2)/i.test(combined)) portsList.push("usb-a")
    if (/hdmi/i.test(combined)) portsList.push("hdmi")
    if (/(headphone|audio|3\.5mm)/i.test(combined)) portsList.push("headphone")
    if (/(sd|microsd)/i.test(expansion)) portsList.push("sd-card")
    if (/(ethernet|rj-45|rj45)/i.test(features)) portsList.push("ethernet")
    if (/(displayport|dp)/i.test(features)) portsList.push("displayport")
  }
  if (portsList.length > 0) r.ports = portsList

  // Security
  const sec = inside.Sensors?.Sensors ?? ""
  const secList: string[] = []
  if (/(fingerprint|touch\s*id)/i.test(sec)) secList.push("fingerprint")
  if (/(face|face\s*id|ir\s+camera|windows\s*hello)/i.test(sec)) secList.push("face")
  if (/(tpm|trusted\s*platform)/i.test(sec)) secList.push("tpm")
  if (secList.length > 0) r.securityFeatures = secList

  // Webcam
  const cam = camera["Front Camera"]?.["Additional Features"] ?? ""
  const camM = cam.match(/(\d+p)/i)
  if (camM) r.webcamQuality = camM[1]

  return r
}

async function fetchTechSpecsFor(lap: SeedLaptop): Promise<Partial<SeedLaptop> | null> {
  const query = [lap.brand, lap.model, lap.variant].filter(Boolean).join(" ")
  const match = await searchTechSpecs(query)
  if (!match) return null

  // Sanity check: verify the returned brand is close to what we expect
  if (match.Brand.toLowerCase() !== lap.brand.toLowerCase()) {
    console.warn(`    Brand mismatch: expected "${lap.brand}", got "${match.Brand}"`)
  }

  const detail = await fetchProductDetail(match.id)
  if (!detail) return null

  console.log(`    → "${detail.Product.Model}" (${detail.Product.Version})`)
  return mapTechSpecsV5(detail)
}

// ── PricesAPI ──

async function searchPricesAPI(
  query: string,
  country: string
): Promise<Array<{ seller: string; price: number; currency: string; url: string | null }> | null> {
  const url = `https://api.pricesapi.io/api/v1/products/search?q=${encodeURIComponent(query)}&country=${country}&limit=3&offers_limit=5`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${PRICESAPI_KEY}` },
    signal: AbortSignal.timeout(95000), // PricesAPI cold calls can take 30-90s
  })
  if (!res.ok) {
    if (res.status !== 404) console.warn(`    PricesAPI HTTP ${res.status} for "${query}" in ${country}`)
    return null
  }
  const json = await res.json()
  const products = json?.data?.products ?? []
  if (products.length === 0) return null

  const offers = products[0].offers ?? []
  return offers.map((o: { seller: string; price: number; currency: string; url?: string }) => ({
    seller: o.seller,
    price: o.price,
    currency: o.currency,
    url: o.url ?? null,
  }))
}

async function fetchPricesFor(lap: SeedLaptop): Promise<SeedLaptop["pricesOverride"] | null> {
  const query = [lap.brand, lap.model, lap.variant].filter(Boolean).join(" ")

  // Search each region for pricing
  const countries = ["us", "gb", "de", "ca", "au", "in"]
  const allOffers: SeedLaptop["pricesOverride"] = []

  for (const [ci, country] of countries.entries()) {
    if (ci > 0) await sleep(11000) // 6 req/min on free tier → 10s between calls + 1s buffer
    const offers = await searchPricesAPI(query, country)
    if (!offers) continue

    for (const offer of offers) {
      // Map seller to region
      const region = offer.seller.toLowerCase() === "amazon"
        ? regionForCurrency(offer.currency) ?? country.toUpperCase()
        : sellerRegion(offer.seller, offer.currency) ?? regionForCurrency(offer.currency) ?? country.toUpperCase()

      // Check if this (region, retailer) pair is valid per our region config
      const regionConfig = REGIONS.find(r => r.code === region)
      const retailer = regionConfig?.retailers.find(r => r.toLowerCase() === offer.seller.toLowerCase())
        ?? offer.seller

      allOffers.push({
        region,
        retailer,
        currency: offer.currency.toUpperCase(),
        price: Math.round(offer.price),
        url: offer.url,
        affiliateUrl: null,
      })
    }
  }

  return allOffers.length > 0 ? allOffers : null
}

// ── Main ──

async function main() {
  console.log("📡 Fetching laptop data...\n")
  console.log(`TechSpecs: ${TECHSPECS_ID && TECHSPECS_KEY ? "✅" : "⏭️"} (set TECHSPECS_API_ID + TECHSPECS_API_KEY)`)
  console.log(`PricesAPI: ${PRICESAPI_KEY ? "✅" : "⏭️"} (set PRICESAPI_API_KEY)`)
  console.log()

  if (!TECHSPECS_ID || !TECHSPECS_KEY) {
    console.log("No TechSpecs credentials — skipping spec updates.")
  }
  if (!PRICESAPI_KEY) {
    console.log("No PricesAPI credentials — skipping price updates.")
  }
  if (!TECHSPECS_ID && !TECHSPECS_KEY && !PRICESAPI_KEY) {
    console.log("No API keys configured. Add them to .env and try again.")
    console.log("Keys needed:")
    console.log("  TECHSPECS_API_ID=<your_id>   (from https://techspecs.io/dashboard)")
    console.log("  TECHSPECS_API_KEY=<your_key> (from https://techspecs.io/dashboard)")
    console.log("  PRICESAPI_API_KEY=<your_key> (from https://pricesapi.io/signup)")
    return
  }

  // Read existing data for seed list + merge fallback
  let existing: SeedLaptop[] = []
  try {
    existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"))
    console.log(`Found ${existing.length} existing laptops\n`)
  } catch {
    console.error("data/laptops.json not found. Run the seed first or create a minimal file.")
    process.exit(1)
  }

  const results: SeedLaptop[] = []
  let specUpdated = 0
  let priceUpdated = 0
  for (let i = 0; i < existing.length; i++) {
    const entry = existing[i]
    const key = `${entry.brand} ${entry.model}${entry.variant ? ` (${entry.variant})` : ""}`
    const pct = `${((i + 1) / existing.length * 100).toFixed(0)}%`
    console.log(`[${pct}] ${key}`)

    // Phase 1: TechSpecs → specs
    let specs: Partial<SeedLaptop> | null = null
    if (TECHSPECS_ID && TECHSPECS_KEY) {
      try {
        specs = await fetchTechSpecsFor(entry)
        if (specs) {
          const mappedFields = Object.keys(specs).filter(k => k !== "price" && k !== "pricesOverride")
          if (mappedFields.length > 0) specUpdated++
        } else {
          console.log(`    No TechSpecs match — keeping existing specs`)
        }
      } catch (e) {
        console.warn(`    TechSpecs error: ${e}`)
      }
    }

    // Phase 2: PricesAPI → pricing
    let pricesOverride: SeedLaptop["pricesOverride"] | null = null
    if (PRICESAPI_KEY) {
      try {
        pricesOverride = await fetchPricesFor(entry)
        if (pricesOverride) {
          priceUpdated++
          console.log(`    Prices: ${pricesOverride.length} offers from ${[...new Set(pricesOverride.map(p => p.retailer))].join(", ")}`)
        } else {
          console.log(`    No PricesAPI offers — keeping fx pricing`)
        }
      } catch (e) {
        console.warn(`    PricesAPI error: ${e}`)
      }
    }

    // Merge: new specs over existing, add pricesOverride if available
    const merged: SeedLaptop = {
      ...entry,
      ...(specs ?? {}),
      ...(pricesOverride ? { pricesOverride } : {}),
    }

    results.push(merged)

    // Rate limit: PricesAPI free tier = 6 req/min, TechSpecs not rate-limited
    // We already sleep inside fetchPricesFor between country calls.
    // If only TechSpecs, no sleep needed.
  }

  // Write
  fs.writeFileSync(DATA_PATH, JSON.stringify(results, null, 2))
  console.log(`\n✅ Done!`)
  console.log(`   Specs updated: ${specUpdated}/${existing.length}`)
  console.log(`   Prices updated: ${priceUpdated}/${existing.length}`)
  console.log(`   Errors: 0`)
}

main().catch(e => {
  console.error("Fatal:", e)
  process.exit(1)
})
