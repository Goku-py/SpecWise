export type UseCase =
  | "student"
  | "office"
  | "coding"
  | "gaming"
  | "video-editing"
  | "graphic-design"
  | "travel"
  | "general"
  | "ai-ml"
  | "mixed"

export type OS = "windows" | "macos" | "chromeos" | "linux" | "no-preference"
export type CpuBrand = "intel" | "amd" | "apple" | "no-preference"
export type GpuRequirement = "integrated" | "dedicated" | "maybe"
export type BatteryPriority = "low" | "medium" | "high" | "top"
export type PortabilityPref = "light" | "balanced" | "desktop-replacement"
export type DisplaySizePref = "13-14" | "15-16" | "17+" | "no-preference"
export type DisplayQualityPref = "basic" | "bright" | "color-accurate" | "oled" | "high-refresh" | "touch"
export type GamingLevel = "none" | "casual" | "esports" | "aaa"
export type UpgradePref = "must-have" | "nice-to-have" | "not-important"
export type ImportanceLevel = "not-important" | "nice-to-have" | "very-important"

export interface QuizAnswers {
  region: string
  useCase: UseCase | null
  budgetMin: number | null
  budgetMax: number | null
  os: OS | null
  cpuBrand: CpuBrand | null
  minRam: number | null
  minStorage: number | null
  gpu: GpuRequirement | null
  battery: BatteryPriority | null
  portability: PortabilityPref | null
  displaySize: DisplaySizePref | null
  displayQuality: string[]
  gaming: GamingLevel | null
  upgradeability: UpgradePref | null
  buildQuality: ImportanceLevel | null
  ports: string[]
  webcam: ImportanceLevel | null
  security: string[]
  refurbished: boolean | null
}

export const defaultQuizAnswers: QuizAnswers = {
  region: "US",
  useCase: null,
  budgetMin: null,
  budgetMax: null,
  os: null,
  cpuBrand: null,
  minRam: null,
  minStorage: null,
  gpu: null,
  battery: null,
  portability: null,
  displaySize: null,
  displayQuality: [],
  gaming: null,
  upgradeability: null,
  buildQuality: null,
  ports: [],
  webcam: null,
  security: [],
  refurbished: null,
}

export interface RetailerPrice {
  retailer: string
  price: number
  currency: string
  url: string | null
  affiliateUrl: string | null
  /** Phase 3: offer state, passed through for stale-explicit UI/JSON-LD. */
  inStock?: boolean
  validUntil?: string | null
}

// Catalog card DTO — shared by the server-rendered /laptops grid and the
// /api/laptops/search response (same field shape).
export interface CatalogLaptop {
  id: string
  // Slug is the preferred URL identity (phase 2a); null until backfilled by seed.
  slug: string | null
  brand: string
  model: string
  variant: string | null
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuCores: number | null
  gpuType: string
  gpuModel: string | null
  ramAmount: number
  storageAmount: number
  storageType: string
  displaySize: number
  displayResolution: string | null
  displayRefreshRate: number
  weight: number | null
  batteryLife: number | null
  imageUrl: string | null
  reviewScore: number | null
  isPopular: boolean
  price: number | null
  currency: string
}

// Retailer price row on the laptop detail page (all regions, sorted by price).
export interface PriceEntry {
  region: string
  retailer: string
  currency: string
  price: number
  url: string | null
  affiliateUrl: string | null
  /** Phase 3: offer state (present when selected with the new fields). */
  inStock?: boolean
  validUntil?: Date | string | null
}

// Full laptop detail DTO — rendered by the server component at /laptops/[id].
export interface LaptopDetail {
  id: string
  slug: string | null
  brand: string
  model: string
  variant: string | null
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuGeneration: string | null
  cpuCores: number | null
  cpuBenchmark: number | null
  gpuType: string
  gpuModel: string | null
  gpuVRAM: number | null
  ramAmount: number
  ramType: string | null
  ramUpgradeable: boolean
  storageAmount: number
  storageType: string
  storageExpandable: boolean
  displaySize: number
  displayResolution: string | null
  displayRefreshRate: number
  displayPanelType: string | null
  displayBrightness: number | null
  displayColorGamut: string | null
  displayTouch: boolean
  batteryCapacity: number | null
  batteryLife: number | null
  weight: number | null
  buildMaterial: string | null
  webcamQuality: string | null
  ports: string[]
  wireless: string | null
  securityFeatures: string[]
  keyboardBacklit: boolean
  isTouchscreen: boolean
  isRefurbished: boolean
  isPopular: boolean
  imageUrl: string | null
  reviewScore: number | null
  notes: string | null
  prices: PriceEntry[]
}

export interface RecommendedLaptop {
  id: string
  brand: string
  model: string
  variant: string | null
  price: number
  currency: string
  region: string
  url: string | null
  affiliateUrl: string | null
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuGeneration: string | null
  cpuCores: number | null
  gpuType: string
  gpuModel: string | null
  gpuVRAM: number | null
  ramAmount: number
  ramUpgradeable: boolean
  storageAmount: number
  storageType: string
  storageExpandable: boolean
  displaySize: number
  displayResolution: string | null
  displayRefreshRate: number
  displayPanelType: string | null
  displayBrightness: number | null
  weight: number | null
  batteryLife: number | null
  imageUrl: string | null
  reviewScore: number | null
  isPopular: boolean
  matchScore: number
  matchReasons: string[]
  tradeoffs: string[]
  retailers: RetailerPrice[]
  // ── v2 authoritative-engine fields (additive; absent on pre-v2 payloads) ──
  priceMissing?: boolean
  /** Passed through from ScorableLaptop.priceStale (Phase 3). */
  priceStale?: boolean
  scoringVersion?: string
  weightsVersion?: string
  relaxed?: boolean
  exhausted?: boolean
  relaxationLedger?: Array<{ requirement: string; from: string; to: string; reason: string }>
  adjustedView?: boolean
  scoringMeta?: {
    caps: Record<string, number | null>
    weights: Record<string, number>
    penalties: number
    bonuses: number
  }
  explanation?: {
    why: string[]
    strengths: Array<{ dim: string; evidence: string }>
    compromises: string[]
    satisfied: string[]
    missed: Array<{ id: string; required: string; actual: string; relaxed: boolean }>
    structuralNotes: string[]
    whyAbove: {
      vsId: string | null
      won: Array<{ dim: string; delta: number }>
      lost: Array<{ dim: string; delta: number }>
    } | null
  }
}

export interface ScorableLaptop {
  id: string
  brand: string
  model: string
  variant: string | null
  price: number
  currency: string
  region: string
  url: string | null
  affiliateUrl: string | null
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuGeneration: string | null
  cpuCores: number | null
  gpuType: string
  gpuModel: string | null
  gpuVRAM: number | null
  ramAmount: number
  ramUpgradeable: boolean
  storageAmount: number
  storageType: string
  storageExpandable: boolean
  displaySize: number
  displayResolution: string | null
  displayRefreshRate: number
  displayPanelType: string | null
  displayBrightness: number | null
  displayColorGamut: string | null
  displayTouch: boolean
  batteryCapacity: number | null
  batteryLife: number | null
  weight: number | null
  buildMaterial: string | null
  webcamQuality: string | null
  ports: string[]
  wireless: string | null
  securityFeatures: string[]
  keyboardBacklit: boolean
  isTouchscreen: boolean
  isRefurbished: boolean
  // Derived in toScorable() from status === "active" — kept for scoring.ts,
  // which filters on this field and is out of scope for phase 2.
  isActive: boolean
  /** True when the region has no price row (Phase 2G quarantine). Set by toScorable(). */
  priceMissing?: boolean
  /** True when the picked offer is out-of-stock or past validUntil (Phase 3:
  representable and explicit, never silently missing). Set by toScorable(). */
  priceStale?: boolean
  isPopular: boolean
  imageUrl: string | null
  reviewScore: number | null
  notes: string | null
  retailers: RetailerPrice[]
}

export type QuestionMode = "simple" | "advanced"
