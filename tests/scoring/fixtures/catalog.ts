import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { deterministicLaptopId } from "@/lib/slug"
import type { ScorableLaptop } from "@/lib/types"

// ─────────────────────────────────────────────────────────────────────────────
// Adapter: data/laptops.json → ScorableLaptop[].
//
// The JSON catalog is the real 56-record dataset. It predates the DB model and
// has no id/status/currency/region/url/retailers fields, so this fixture
// synthesizes them the same way the app does:
//   - id           → deterministicLaptopId(brand, model, variant) (see src/lib/slug.ts)
//   - isActive     → true (every row in the JSON catalog is an active listing)
//   - currency     → "USD", region → "US"
//   - url/retailers → null/[] (no pricing rows in the JSON file)
// Fields that appear on some rows only (gpuVRAM, displayColorGamut,
// batteryCapacity, notes, variant) default to null when absent.
// ─────────────────────────────────────────────────────────────────────────────

interface RawLaptopRecord {
  brand: string
  model: string
  variant: string | null
  price: number
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuCores: number | null
  gpuType: string
  gpuModel: string | null
  gpuVRAM?: number | null
  ramAmount: number
  ramType?: string | null
  ramUpgradeable: boolean
  storageAmount: number
  storageType: string
  storageExpandable: boolean
  displaySize: number
  displayResolution: string | null
  displayRefreshRate: number
  displayPanelType: string | null
  displayBrightness: number | null
  displayColorGamut?: string | null
  batteryLife: number | null
  batteryCapacity?: number | null
  weight: number | null
  buildMaterial: string | null
  webcamQuality: string | null
  ports: string[]
  wireless: string | null
  securityFeatures: string[]
  keyboardBacklit: boolean
  isTouchscreen: boolean
  isPopular: boolean
  reviewScore: number | null
  notes: string | null
}

function readRawCatalog(): RawLaptopRecord[] {
  const jsonPath = fileURLToPath(
    new URL("../../../data/laptops.json", import.meta.url)
  )
  return JSON.parse(readFileSync(jsonPath, "utf8")) as RawLaptopRecord[]
}

function toScorableFromRaw(raw: RawLaptopRecord): ScorableLaptop {
  return {
    id: deterministicLaptopId(raw.brand, raw.model, raw.variant),
    brand: raw.brand,
    model: raw.model,
    variant: raw.variant,
    price: raw.price,
    currency: "USD",
    region: "US",
    url: null,
    affiliateUrl: null,
    os: raw.os,
    cpuBrand: raw.cpuBrand,
    cpuFamily: raw.cpuFamily,
    cpuGeneration: null,
    cpuCores: raw.cpuCores,
    gpuType: raw.gpuType,
    gpuModel: raw.gpuModel,
    gpuVRAM: raw.gpuVRAM ?? null,
    ramAmount: raw.ramAmount,
    ramUpgradeable: raw.ramUpgradeable,
    storageAmount: raw.storageAmount,
    storageType: raw.storageType,
    storageExpandable: raw.storageExpandable,
    displaySize: raw.displaySize,
    displayResolution: raw.displayResolution,
    displayRefreshRate: raw.displayRefreshRate,
    displayPanelType: raw.displayPanelType,
    displayBrightness: raw.displayBrightness,
    displayColorGamut: raw.displayColorGamut ?? null,
    displayTouch: false,
    batteryCapacity: raw.batteryCapacity ?? null,
    batteryLife: raw.batteryLife,
    weight: raw.weight,
    buildMaterial: raw.buildMaterial,
    webcamQuality: raw.webcamQuality,
    ports: raw.ports,
    wireless: raw.wireless,
    securityFeatures: raw.securityFeatures,
    keyboardBacklit: raw.keyboardBacklit,
    isTouchscreen: raw.isTouchscreen,
    isRefurbished: false,
    isActive: true,
    isPopular: raw.isPopular,
    imageUrl: null,
    reviewScore: raw.reviewScore,
    notes: raw.notes ?? null,
    retailers: [],
  }
}

export const catalogLaptops: ScorableLaptop[] = readRawCatalog().map(
  toScorableFromRaw
)

export const catalogById: ReadonlyMap<string, ScorableLaptop> = new Map(
  catalogLaptops.map(l => [l.id, l])
)
