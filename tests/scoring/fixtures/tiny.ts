import type { ScorableLaptop } from "@/lib/types"

// ─────────────────────────────────────────────────────────────────────────────
// Curated mini-catalog of hand-built ScorableLaptop objects engineered to
// exercise scoring-engine edge cases:
//   (a) budget extremes          — tiny-budget-low / tiny-budget-huge
//   (b) OS mismatch              — tiny-mac-air (macOS vs Windows preference)
//   (c) GPU requirement unmet    — tiny-integrated-15
//   (d) portability extremes     — tiny-ultralight / tiny-desktop-replacement
//   (e) last-resort-only reach   — tiny-popular-loose (price 2600 is inside the
//                                  loose budget band [0.5x, 1.5x] but outside the
//                                  strict band [1.0x, 1.0x] and fallback band
//                                  [0.7x, 1.3x] for a 5000–5500 budget)
//   (f) sparse fields            — tiny-sparse (nulls on every optional)
// ─────────────────────────────────────────────────────────────────────────────

interface TinyOverrides {
  id: string
  brand: string
  model: string
  variant?: string | null
  price: number
  os?: string
  cpuBrand?: string
  cpuCores?: number | null
  ramAmount?: number
  storageAmount?: number
  gpuType?: string
  gpuVRAM?: number | null
  displayRefreshRate?: number
  weight?: number | null
  batteryLife?: number | null
  ramUpgradeable?: boolean
  buildMaterial?: string | null
  ports?: string[]
  isPopular?: boolean
  isActive?: boolean
}

function laptop(overrides: TinyOverrides): ScorableLaptop {
  const base: ScorableLaptop = {
    id: overrides.id,
    brand: overrides.brand,
    model: overrides.model,
    variant: overrides.variant ?? null,
    price: overrides.price,
    currency: "USD",
    region: "US",
    url: null,
    affiliateUrl: null,
    os: overrides.os ?? "Windows",
    cpuBrand: overrides.cpuBrand ?? "Intel",
    cpuFamily: "Core",
    cpuGeneration: null,
    cpuCores: overrides.cpuCores ?? 8,
    gpuType: overrides.gpuType ?? "integrated",
    gpuModel: null,
    gpuVRAM: overrides.gpuVRAM ?? null,
    ramAmount: overrides.ramAmount ?? 16,
    ramUpgradeable: overrides.ramUpgradeable ?? false,
    storageAmount: overrides.storageAmount ?? 512,
    storageType: "SSD",
    storageExpandable: false,
    displaySize: 14,
    displayResolution: "1920x1200",
    displayRefreshRate: overrides.displayRefreshRate ?? 60,
    displayPanelType: "IPS",
    displayBrightness: 350,
    displayColorGamut: null,
    displayTouch: false,
    batteryCapacity: null,
    batteryLife: overrides.batteryLife ?? 8,
    weight: overrides.weight ?? 1.7,
    buildMaterial: overrides.buildMaterial ?? "Plastic",
    webcamQuality: "720p",
    ports: overrides.ports ?? ["usb-a", "hdmi", "headphone"],
    wireless: "WiFi 6",
    securityFeatures: [],
    keyboardBacklit: true,
    isTouchscreen: false,
    isRefurbished: false,
    isActive: overrides.isActive ?? true,
    isPopular: overrides.isPopular ?? false,
    imageUrl: null,
    reviewScore: 4.0,
    notes: null,
    retailers: [],
  }
  return base
}

/**
 * Full-matching laptop for a "coding" profile: Windows + Intel + 32 GB RAM +
 * dedicated GPU + upgradeable RAM + aluminum build + thunderbolt.
 */
export const tinyWindowsPro: ScorableLaptop = laptop({
  id: "tiny-windows-pro",
  brand: "TinyBrand",
  model: "Windows Pro 16",
  price: 1499,
  os: "Windows",
  cpuBrand: "Intel",
  cpuCores: 16,
  ramAmount: 32,
  storageAmount: 1024,
  gpuType: "dedicated",
  gpuVRAM: 8,
  displayRefreshRate: 144,
  weight: 1.9,
  batteryLife: 9,
  ramUpgradeable: true,
  buildMaterial: "Aluminum",
  ports: ["usb-a", "usb-c", "hdmi", "thunderbolt", "headphone"],
  isPopular: true,
})

export const tinyBudgetLow: ScorableLaptop = laptop({
  id: "tiny-budget-low",
  brand: "TinyBrand",
  model: "Budget Basic 15",
  price: 250,
  cpuCores: 4,
  ramAmount: 8,
  storageAmount: 256,
  batteryLife: 6,
  ramUpgradeable: true,
  ports: ["usb-a", "hdmi", "headphone"],
})

export const tinyBudgetHuge: ScorableLaptop = laptop({
  id: "tiny-budget-huge",
  brand: "TinyBrand",
  model: "Workstation Ultra",
  price: 8500,
  cpuCores: 24,
  ramAmount: 32,
  storageAmount: 4096,
  gpuType: "dedicated",
  gpuVRAM: 24,
  displayRefreshRate: 240,
  weight: 3.0,
  batteryLife: 3,
  buildMaterial: "Aluminum",
})

/** macOS laptop — the OS-mismatch target for Windows preferences. */
export const tinyMacAir: ScorableLaptop = laptop({
  id: "tiny-mac-air",
  brand: "TinyBrand",
  model: "MacBook Slim",
  price: 1199,
  os: "macOS",
  cpuBrand: "Apple",
  cpuCores: 8,
  ramAmount: 16,
  storageAmount: 512,
  weight: 1.24,
  batteryLife: 16,
  ports: ["usb-c"],
  isPopular: true,
})

export const tinyGamingRig: ScorableLaptop = laptop({
  id: "tiny-gaming-rig",
  brand: "TinyBrand",
  model: "Gaming Rig 16",
  price: 2199,
  cpuBrand: "AMD",
  cpuCores: 16,
  ramAmount: 32,
  storageAmount: 2048,
  gpuType: "dedicated",
  gpuVRAM: 12,
  displayRefreshRate: 240,
  weight: 2.6,
  batteryLife: 5,
  ramUpgradeable: true,
  buildMaterial: "Aluminum",
  ports: ["usb-a", "hdmi", "ethernet", "headphone"],
  isPopular: true,
})

/** Integrated-GPU laptop — fails a "dedicated" GPU requirement. */
export const tinyIntegrated15: ScorableLaptop = laptop({
  id: "tiny-integrated-15",
  brand: "TinyBrand",
  model: "Integrated 15",
  price: 899,
  ramAmount: 16,
  storageAmount: 512,
  batteryLife: 7,
  ports: ["usb-a", "hdmi", "headphone"],
})

/** Portability extreme: 0.85 kg, 12 h battery. */
export const tinyUltraLight: ScorableLaptop = laptop({
  id: "tiny-ultralight",
  brand: "TinyBrand",
  model: "Feather 13",
  price: 1299,
  ramAmount: 16,
  storageAmount: 512,
  weight: 0.85,
  batteryLife: 12,
  buildMaterial: "Magnesium",
  ports: ["usb-c", "thunderbolt", "headphone"],
})

/** Portability extreme: 3.4 kg desktop replacement. */
export const tinyDesktopReplacement: ScorableLaptop = laptop({
  id: "tiny-desktop-replacement",
  brand: "TinyBrand",
  model: "Desktop Replacement 17",
  price: 1799,
  cpuBrand: "AMD",
  cpuCores: 16,
  ramAmount: 32,
  storageAmount: 2048,
  gpuType: "dedicated",
  gpuVRAM: 8,
  displayRefreshRate: 165,
  weight: 3.4,
  batteryLife: 4,
  ramUpgradeable: true,
  buildMaterial: "Aluminum",
  ports: ["usb-a", "hdmi", "ethernet", "headphone"],
})

/**
 * Price 2600 with budget [5000, 5500]:
 *  - strict band [5000, 5500]  → no
 *  - fallback band [3500, 7150] → no
 *  - loose last-resort band [2500, 8250] → YES
 * Only the (currently unreachable) last-resort branch could surface it.
 */
export const tinyPopularLoose: ScorableLaptop = laptop({
  id: "tiny-popular-loose",
  brand: "TinyBrand",
  model: "Popular Loose Fit",
  price: 2600,
  cpuCores: 12,
  ramAmount: 24,
  storageAmount: 1024,
  gpuType: "dedicated",
  gpuVRAM: 8,
  displayRefreshRate: 120,
  weight: 2.1,
  batteryLife: 8,
  ramUpgradeable: true,
  buildMaterial: "Aluminum",
  ports: ["usb-a", "usb-c", "hdmi"],
  isPopular: true,
})

/** Sparse fields — every optional is null; must not crash any score function. */
export const tinySparse: ScorableLaptop = {
  id: "tiny-sparse",
  brand: "TinyBrand",
  model: "Sparse Shell",
  variant: null,
  price: 999,
  currency: "USD",
  region: "US",
  url: null,
  affiliateUrl: null,
  os: "Windows",
  cpuBrand: "Intel",
  cpuFamily: "Core",
  cpuGeneration: null,
  cpuCores: null,
  gpuType: "integrated",
  gpuModel: null,
  gpuVRAM: null,
  ramAmount: 8,
  ramUpgradeable: false,
  storageAmount: 256,
  storageType: "SSD",
  storageExpandable: false,
  displaySize: 13.3,
  displayResolution: null,
  displayRefreshRate: 60,
  displayPanelType: null,
  displayBrightness: null,
  displayColorGamut: null,
  displayTouch: false,
  batteryCapacity: null,
  batteryLife: null,
  weight: null,
  buildMaterial: null,
  webcamQuality: null,
  ports: [],
  wireless: null,
  securityFeatures: [],
  keyboardBacklit: false,
  isTouchscreen: false,
  isRefurbished: false,
  isActive: true,
  isPopular: false,
  imageUrl: null,
  reviewScore: null,
  notes: null,
  retailers: [],
}

export const tinyCatalog: ScorableLaptop[] = [
  tinyWindowsPro,
  tinyBudgetLow,
  tinyBudgetHuge,
  tinyMacAir,
  tinyGamingRig,
  tinyIntegrated15,
  tinyUltraLight,
  tinyDesktopReplacement,
  tinyPopularLoose,
  tinySparse,
]

export const tinyCatalogById: ReadonlyMap<string, ScorableLaptop> = new Map(
  tinyCatalog.map(l => [l.id, l])
)
