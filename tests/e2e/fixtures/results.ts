import type { QuizAnswers, RecommendedLaptop } from "../../../src/lib/types"

/**
 * Seeded-state fixture for the e2e suite (Phase 4c).
 *
 * Captured from the REAL live server on 2026-08-03 by POSTing to
 * http://localhost:3000/api/quiz with a full QuizAnswers body (useCase=coding,
 * budget 800–2000, …). The response was trimmed to the three top results and
 * hardcoded below so the seeded tests never hit the rate-limited API.
 *
 * The shape is exactly what the app stores under `specwise-results` — i.e. the
 * raw JSON body of POST /api/quiz (`{ results, total }`) — and every field
 * consumed by results-grid.tsx / compare-content.tsx is present.
 */

export const SEEDED_RESULTS: RecommendedLaptop[] = [
  {
    id: "MSI-Stealth 14 Studio",
    brand: "MSI",
    model: "Stealth 14 Studio",
    variant: null,
    price: 1631,
    currency: "USD",
    region: "US",
    url: null,
    affiliateUrl: null,
    os: "Windows",
    cpuBrand: "Intel",
    cpuFamily: "Core Ultra 7 155H",
    cpuGeneration: null,
    cpuCores: 16,
    gpuType: "dedicated",
    gpuModel: "NVIDIA RTX 4060",
    gpuVRAM: 8,
    ramAmount: 16,
    ramUpgradeable: true,
    storageAmount: 1024,
    storageType: "SSD",
    storageExpandable: true,
    displaySize: 14,
    displayResolution: "2560x1600",
    displayRefreshRate: 165,
    displayPanelType: "IPS",
    displayBrightness: 400,
    weight: 1.7,
    batteryLife: 7,
    imageUrl:
      "https://images.unsplash.com/photo-1617294864710-bb97f05457f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTY5NDV8MHwxfHNlYXJjaHwxfHxNU0klMjBTdGVhbHRoJTIwMTQlMjBTdHVkaW8lMjBsYXB0b3B8ZW58MHwwfHx8MTc4NTY1MDQzNXww&ixlib=rb-4.1.0&q=80&w=400",
    reviewScore: 4.3,
    isPopular: false,
    matchScore: 92,
    matchReasons: [
      "16 GB RAM meets your minimum requirement",
      "16-core processor handles demanding workloads",
    ],
    tradeoffs: [],
    retailers: [
      { retailer: "Best Buy", price: 1631, currency: "USD", url: null, affiliateUrl: null },
      { retailer: "Amazon", price: 1699, currency: "USD", url: null, affiliateUrl: null },
    ],
  },
  {
    id: "Acer-Predator Helios 16",
    brand: "Acer",
    model: "Predator Helios 16",
    variant: null,
    price: 1919,
    currency: "USD",
    region: "US",
    url: null,
    affiliateUrl: null,
    os: "Windows",
    cpuBrand: "Intel",
    cpuFamily: "Core i9 14900HX",
    cpuGeneration: null,
    cpuCores: 24,
    gpuType: "dedicated",
    gpuModel: "NVIDIA RTX 4070",
    gpuVRAM: 8,
    ramAmount: 32,
    ramUpgradeable: true,
    storageAmount: 1024,
    storageType: "SSD",
    storageExpandable: true,
    displaySize: 16,
    displayResolution: "2560x1600",
    displayRefreshRate: 240,
    displayPanelType: "IPS",
    displayBrightness: 500,
    weight: 2.6,
    batteryLife: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1556583186-c7b22658adea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTY5NDV8MHwxfHNlYXJjaHwxfHxBY2VyJTIwUHJlZGF0b3IlMjBIZWxpb3MlMjAxNiUyMGxhcHRvcHxlbnwwfDB8fHwxNzg1NjUwNDM0fDA&ixlib=rb-4.1.0&q=80&w=400",
    reviewScore: 4.5,
    isPopular: false,
    matchScore: 92,
    matchReasons: [
      "32 GB RAM meets your minimum requirement",
      "24-core processor handles demanding workloads",
    ],
    tradeoffs: [],
    retailers: [
      { retailer: "Best Buy", price: 1919, currency: "USD", url: null, affiliateUrl: null },
      { retailer: "Amazon", price: 1999, currency: "USD", url: null, affiliateUrl: null },
    ],
  },
  {
    id: "HP-OMEN 16",
    brand: "HP",
    model: "OMEN 16",
    variant: null,
    price: 1823,
    currency: "USD",
    region: "US",
    url: null,
    affiliateUrl: null,
    os: "Windows",
    cpuBrand: "Intel",
    cpuFamily: "Core i9 14900HX",
    cpuGeneration: null,
    cpuCores: 24,
    gpuType: "dedicated",
    gpuModel: "NVIDIA RTX 4070",
    gpuVRAM: 8,
    ramAmount: 32,
    ramUpgradeable: true,
    storageAmount: 1024,
    storageType: "SSD",
    storageExpandable: true,
    displaySize: 16.1,
    displayResolution: "2560x1440",
    displayRefreshRate: 240,
    displayPanelType: "IPS",
    displayBrightness: 400,
    weight: 2.5,
    batteryLife: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1663354027456-ce6a7e07d212?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTY5NDV8MHwxfHNlYXJjaHwxfHxIUCUyME9NRU4lMjAxNiUyMGxhcHRvcHxlbnwwfDB8fHwxNzg1NjUwNDE5fDA&ixlib=rb-4.1.0&q=80&w=400",
    reviewScore: 4.4,
    isPopular: false,
    matchScore: 92,
    matchReasons: [
      "32 GB RAM meets your minimum requirement",
      "24-core processor handles demanding workloads",
    ],
    tradeoffs: [],
    retailers: [
      { retailer: "Best Buy", price: 1823, currency: "USD", url: null, affiliateUrl: null },
      { retailer: "Amazon", price: 1899, currency: "USD", url: null, affiliateUrl: null },
    ],
  },
]

/**
 * Answers fixture stored under `specwise-answers`. `region` MUST equal the
 * region the page shell resolves from the region cookie ("US" for a fresh
 * browser context) — results-view.tsx re-fetches recommendations when they
 * differ, which would burn the rate-limited quiz budget.
 */
export const SEEDED_QUIZ_ANSWERS: QuizAnswers = {
  region: "US",
  useCase: "coding",
  budgetMin: 800,
  budgetMax: 2000,
  os: "windows",
  cpuBrand: "no-preference",
  minRam: 16,
  minStorage: 512,
  gpu: "dedicated",
  battery: "high",
  portability: "balanced",
  displaySize: "15-16",
  displayQuality: [],
  gaming: "none",
  upgradeability: "nice-to-have",
  buildQuality: "nice-to-have",
  ports: [],
  webcam: "nice-to-have",
  security: [],
  refurbished: false,
}

/** The two laptop ids used by the seeded /compare test (must exist in the fixture). */
export const SEEDED_COMPARE_IDS = [
  "MSI-Stealth 14 Studio",
  "Acer-Predator Helios 16",
] as const
