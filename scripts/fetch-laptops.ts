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

interface TechSpecsProduct {
  _id?: string
  name?: string
  brand?: string
  specifications?: Record<string, string>
  [key: string]: unknown
}

async function searchTechSpecs(query: string): Promise<TechSpecsProduct | null> {
  const url = `https://api.techspecs.io/v5/products/search?query=${encodeURIComponent(query)}&category=Laptop`
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
  // v5 response: { data: { products: [...] } } or { products: [...] }
  const products: TechSpecsProduct[] = json?.data?.products ?? json?.products ?? []
  if (products.length === 0) {
    // Try searching by brand+model
    const altUrl = `https://api.techspecs.io/v5/products/search?query=${encodeURIComponent(query.split(" ").slice(0, 3).join(" "))}&category=Laptop&limit=5`
    const altRes = await fetch(altUrl, {
      headers: {
        "x-api-id": TECHSPECS_ID!,
        "x-api-key": TECHSPECS_KEY!,
      },
    })
    if (!altRes.ok) return null
    const altJson = await altRes.json()
    const altProducts: TechSpecsProduct[] = altJson?.data?.products ?? altJson?.products ?? []
    return altProducts[0] ?? null
  }
  return products[0]
}

function mapTechSpecs(specs: Record<string, string>): Partial<SeedLaptop> {
  const r: Partial<SeedLaptop> = {}

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = specs[k]
      if (v && v.trim()) return v.trim()
    }
    return ""
  }

  // Processor
  const cpu = get("Processor", "CPU", "Processor Name")
  if (cpu) {
    if (/^apple/i.test(cpu)) {
      r.cpuBrand = "Apple"
      r.cpuFamily = cpu.replace(/^Apple\s+/i, "")
    } else if (/^intel/i.test(cpu)) {
      r.cpuBrand = "Intel"
      const m = cpu.match(/Intel\s+(.+?)\s+\d/)
      r.cpuFamily = m ? m[1].trim() : cpu.replace(/^Intel\s+/i, "")
    } else if (/^amd/i.test(cpu)) {
      r.cpuBrand = "AMD"
      r.cpuFamily = cpu.replace(/^AMD\s+/i, "")
    }
  }

  // CPU generation
  const gen = get("Generation", "CPU Generation", "Processor Generation")
  if (gen) r.cpuGeneration = gen

  // CPU cores
  const cores = get("CPU Cores", "Core Count", "Cores")
  const coreN = extractNumber(cores)
  if (coreN != null) r.cpuCores = coreN

  // CPU benchmark
  const bench = get("Benchmark", "CPU Benchmark", "Passmark")
  const benchN = extractNumber(bench)
  if (benchN != null) r.cpuBenchmark = benchN

  // GPU
  const gpu = get("GPU", "Graphics", "Graphics Processor", "GPU Model")
  if (gpu) {
    r.gpuModel = gpu
    if (/integrated|apple\s+m/i.test(gpu)) r.gpuType = "integrated"
    else if (/dedicated|discrete|nvidia|radeon|rtx|gtx|arc/i.test(gpu)) r.gpuType = "dedicated"
  }

  const vram = get("VRAM", "GPU VRAM", "Graphics Memory", "Video Memory")
  const vramN = extractGB(vram)
  if (vramN != null) r.gpuVRAM = vramN

  // RAM
  const mem = get("Memory", "RAM", "System Memory", "Memory Size")
  const memN = extractGB(mem)
  if (memN != null) r.ramAmount = memN

  if (/DDR5/i.test(mem)) r.ramType = /LPDDR5/i.test(mem) ? "LPDDR5" : "DDR5"
  else if (/DDR4/i.test(mem)) r.ramType = /LPDDR4/i.test(mem) ? "LPDDR4" : "DDR4"
  else if (/LPDDR5X/i.test(mem)) r.ramType = "LPDDR5X"

  // RAM upgradeable
  const memUpg = get("Memory Upgradeable", "RAM Upgradeable", "RAM Slots")
  if (/yes|true|upgradeable/i.test(memUpg)) r.ramUpgradeable = true
  else if (/no|false|soldered/i.test(memUpg)) r.ramUpgradeable = false

  // Storage
  const storage = get("Storage", "Hard Drive", "SSD", "Storage Drive")
  if (storage) {
    const n = extractGB(storage)
    if (n != null) r.storageAmount = n
    r.storageType = /ssd|nvme|solid.?state/i.test(storage) ? "SSD" : /hdd|hard.?drive/i.test(storage) ? "HDD" : "SSD"
  }

  const storageExp = get("Storage Expandable", "Expandable Storage", "Card Reader")
  if (/yes|true|expandable|sd/i.test(storageExp)) r.storageExpandable = true

  // Display
  const disp = get("Display", "Display Size", "Screen Size", "Screen")
  const dispN = extractNumber(disp)
  if (dispN != null && dispN > 5 && dispN < 30) r.displaySize = dispN

  const resStr = get("Resolution", "Display Resolution", "Screen Resolution")
  if (resStr && /\d+x\d+/i.test(resStr)) r.displayResolution = resStr.match(/\d+x\d+/i)?.[0]

  const hz = get("Refresh Rate", "Display Refresh Rate")
  const hzN = extractHz(hz)
  if (hzN != null) r.displayRefreshRate = hzN

  const panel = get("Panel Type", "Display Type", "Panel Technology")
  if (panel) {
    if (/oled|amoled/i.test(panel)) r.displayPanelType = "OLED"
    else if (/ips/i.test(panel)) r.displayPanelType = "IPS"
    else if (/mini.?led/i.test(panel)) r.displayPanelType = "Mini-LED"
    else if (/tn/i.test(panel)) r.displayPanelType = "TN"
    else if (/va/i.test(panel)) r.displayPanelType = "VA"
  }

  const brightness = get("Brightness", "Display Brightness")
  const brightN = extractNumber(brightness)
  if (brightN != null && brightN > 100) r.displayBrightness = brightN

  const colorGamut = get("Color Gamut", "Color Space", "Color Coverage")
  if (colorGamut) r.displayColorGamut = colorGamut

  const touch = get("Touch Screen", "Touchscreen", "Display Touch")
  if (/yes|true/i.test(touch)) r.displayTouch = true
  else if (/no|false/i.test(touch)) r.displayTouch = false

  // Battery
  const batt = get("Battery", "Battery Capacity")
  const battN = extractNumber(batt)
  if (battN != null && battN > 10 && battN < 200) r.batteryCapacity = battN

  const battLife = get("Battery Life")
  const lifeN = extractNumber(battLife)
  if (lifeN != null && lifeN > 1 && lifeN < 50) r.batteryLife = lifeN

  // Weight
  const w = get("Weight")
  const wN = extractKg(w)
  if (wN != null) r.weight = wN

  // Build material
  const mat = get("Material", "Build Material", "Chassis Material", "Case Material")
  if (mat) {
    if (/aluminum|aluminium/i.test(mat)) r.buildMaterial = "Aluminum"
    else if (/magnesium/i.test(mat)) r.buildMaterial = "Magnesium"
    else if (/carbon/i.test(mat)) r.buildMaterial = "Carbon Fiber"
    else if (/plastic|polycarbonate/i.test(mat)) r.buildMaterial = "Plastic"
  }

  // Webcam
  const cam = get("Camera", "Webcam")
  const camM = cam.match(/(\d+p)/i)
  if (camM) r.webcamQuality = camM[1]

  // OS
  const os = get("Operating System", "OS")
  if (os) {
    if (/mac/i.test(os)) r.os = "macOS"
    else if (/windows/i.test(os)) r.os = "Windows"
    else if (/linux/i.test(os)) r.os = "Linux"
    else if (/chrome/i.test(os)) r.os = "Chrome OS"
  }

  // Ports
  const ports = get("Ports", "Connectivity")
  const portList: string[] = []
  if (/(usb-c|thunderbolt|usb\s*c)/i.test(ports)) portList.push("usb-c")
  if (/(usb-a|usb\s*3|usb\s*2)/i.test(ports)) portList.push("usb-a")
  if (/hdmi/i.test(ports)) portList.push("hdmi")
  if (/(headphone|audio\s*jack|3\.5mm)/i.test(ports)) portList.push("headphone")
  if (/(sd|microsd)/i.test(ports)) portList.push("sd-card")
  if (/(ethernet|rj-45|rj45)/i.test(ports)) portList.push("ethernet")
  if (/displayport|dp/i.test(ports)) portList.push("displayport")
  if (portList.length > 0) r.ports = portList

  // Wireless
  const wf = get("Wireless", "Wi-Fi", "WiFi", "Wireless Connectivity")
  if (wf) {
    if (/wifi 7|wi-fi 7/i.test(wf)) r.wireless = "WiFi 7"
    else if (/wifi 6e|wi-fi 6e/i.test(wf)) r.wireless = "WiFi 6E"
    else if (/wifi 6|wi-fi 6/i.test(wf)) r.wireless = "WiFi 6"
    else if (/wifi 5|wi-fi 5/i.test(wf)) r.wireless = "WiFi 5"
    else if (/bluetooth/i.test(wf)) r.wireless = r.wireless || wf
  }

  // Security
  const sec = get("Security", "Security Features", "Biometric")
  const secList: string[] = []
  if (/(fingerprint|touch\s*id)/i.test(sec)) secList.push("fingerprint")
  if (/(face|face\s*id|ir\s+camera|windows\s*hello)/i.test(sec)) secList.push("face")
  if (/(tpm|trusted\s*platform)/i.test(sec)) secList.push("tpm")
  if (secList.length > 0) r.securityFeatures = secList

  // Keyboard backlit
  const kb = get("Keyboard", "Backlit Keyboard")
  if (/backlit/i.test(kb)) r.keyboardBacklit = true
  else if (/no/i.test(kb)) r.keyboardBacklit = false

  // Touchscreen (might also be in Display specs)
  if (!r.isTouchscreen) {
    const ts = get("Touch Screen", "Touchscreen")
    if (/yes|true/i.test(ts)) r.isTouchscreen = true
  }

  // Review score
  const score = get("Rating", "Review Score", "User Rating")
  const scoreN = extractNumber(score)
  if (scoreN != null && scoreN > 0 && scoreN <= 5) r.reviewScore = scoreN

  return r
}

async function fetchTechSpecsFor(lap: SeedLaptop): Promise<Partial<SeedLaptop> | null> {
  const query = [lap.brand, lap.model, lap.variant].filter(Boolean).join(" ")
  const product = await searchTechSpecs(query)
  if (!product?.specifications) return null

  const mapped = mapTechSpecs(product.specifications)

  // Sanity check: verify the returned brand is close to what we expect
  if (product.brand && product.brand.toLowerCase() !== lap.brand.toLowerCase()) {
    // TechSpecs brand mismatch — log but still use data (some brands have different names)
    console.warn(`    Brand mismatch: expected "${lap.brand}", got "${product.brand}"`)
  }

  if (product.name) {
    console.log(`    → Parsed: "${product.name}"`)
  }

  return mapped
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

  for (const country of countries) {
    await sleep(11000) // 6 req/min on free tier → 10s between calls + 1s buffer
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

  const index = new Map(existing.map(l => [laptopKey(l), l]))
  const results: SeedLaptop[] = []
  let specUpdated = 0
  let priceUpdated = 0
  let errors = 0

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
  console.log(`   Errors: ${errors}`)
}

main().catch(e => {
  console.error("Fatal:", e)
  process.exit(1)
})
