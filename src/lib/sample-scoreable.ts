/**
 * Static ScoreableProduct fixtures for the quiz preview route.
 * Swap for live catalog data when the Product spine is fully backfilled.
 */
import type { ScoreableProduct } from "@/lib/recommendation"
import type { LaptopSpecInput } from "@/lib/validation/product"

function spec(over: Partial<LaptopSpecInput> = {}): LaptopSpecInput {
  return {
    os: "Windows 11",
    cpuBrand: "AMD",
    cpuFamily: "Ryzen 7",
    cpuCores: 8,
    cpuThreads: 16,
    cpuBenchmark: 12_000,
    gpuType: "DEDICATED",
    gpuModel: "RTX 4060",
    gpuVRAMGb: 8,
    gpuTgpW: 80,
    ramAmountGb: 16,
    ramType: "DDR5",
    ramUpgradeable: true,
    storageAmountGb: 512,
    storageType: "SSD",
    storageExpandable: true,
    displaySizeIn: 15.6,
    displayWidthPx: 1920,
    displayHeightPx: 1080,
    displayRefreshHz: 144,
    displayPanelType: "IPS",
    displayNits: 350,
    displayTouch: false,
    batteryWh: 70,
    batteryLifeHr: 8,
    weightKg: 1.8,
    ports: [],
    wires: [],
    security: [],
    ...over,
  } as LaptopSpecInput
}

export const SAMPLE_SCOREABLE: ScoreableProduct[] = [
  {
    product: { id: "s1", name: "Nitro V", brandLabel: "Acer", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({ cpuFamily: "Core i5", cpuBrand: "Intel", cpuCores: 10, gpuModel: "RTX 4050", gpuVRAMGb: 6, displayRefreshHz: 144, weightKg: 2.1 }),
    price: 899,
  },
  {
    product: { id: "s2", name: "Legion Slim 5", brandLabel: "Lenovo", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({ cpuFamily: "Ryzen 7", cpuCores: 8, gpuModel: "RTX 4060", gpuVRAMGb: 8, displayRefreshHz: 165, batteryWh: 80, weightKg: 2.3 }),
    price: 1299,
  },
  {
    product: { id: "s3", name: "Zenbook 14", brandLabel: "ASUS", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({
      cpuFamily: "Core Ultra 7", cpuBrand: "Intel", cpuCores: 12, gpuType: "INTEGRATED", gpuModel: null, gpuVRAMGb: null, gpuTgpW: null,
      ramUpgradeable: false, displayRefreshHz: 60, displayPanelType: "OLED", displayNits: 600,
      batteryWh: 75, batteryLifeHr: 12, weightKg: 1.28, displaySizeIn: 14,
    }),
    price: 1099,
  },
  {
    product: { id: "s4", name: "ROG Strix G16", brandLabel: "ASUS", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({ cpuBrand: "Intel", cpuFamily: "Core i7", cpuCores: 14, cpuBenchmark: 16_000, gpuModel: "RTX 4070", gpuVRAMGb: 8, gpuTgpW: 140, batteryWh: 90, displayRefreshHz: 240, weightKg: 2.5 }),
    price: 1799,
  },
  {
    product: { id: "s5", name: "IdeaPad Slim 3", brandLabel: "Lenovo", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({
      cpuFamily: "Ryzen 5", cpuCores: 6, cpuBenchmark: 8_000, gpuType: "INTEGRATED", gpuModel: null, gpuVRAMGb: null, gpuTgpW: null,
      ramAmountGb: 8, storageAmountGb: 256, displayRefreshHz: 60, displayNits: 250,
      batteryWh: 47, batteryLifeHr: 7, weightKg: 1.6, ramUpgradeable: true,
    }),
    price: 549,
  },
  {
    product: { id: "s6", name: "MacBook Air 13", brandLabel: "Apple", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({
      os: "macOS", cpuBrand: "Apple", cpuFamily: "M3", cpuCores: 8, cpuBenchmark: 14_000,
      gpuType: "INTEGRATED", gpuModel: "Apple GPU", gpuVRAMGb: null, gpuTgpW: null,
      ramAmountGb: 16, ramType: "LPDDR5X", ramUpgradeable: false,
      storageAmountGb: 512, displaySizeIn: 13.6, displayRefreshHz: 60, displayPanelType: "IPS", displayNits: 500,
      batteryWh: 52, batteryLifeHr: 15, weightKg: 1.24,
    }),
    price: 1199,
  },
  {
    product: { id: "s7", name: "Predator Helios 18", brandLabel: "Acer", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({ cpuBrand: "Intel", cpuFamily: "Core i9", cpuCores: 24, cpuBenchmark: 20_000, gpuModel: "RTX 4080", gpuVRAMGb: 12, gpuTgpW: 175, batteryWh: 90, displayRefreshHz: 240, displaySizeIn: 18, weightKg: 3.1 }),
    price: 2499,
  },
  {
    product: { id: "s8", name: "Swift Go 14", brandLabel: "Acer", category: "LAPTOP", imageUrl: null },
    laptopSpec: spec({
      cpuBrand: "Intel", cpuFamily: "Core Ultra 5", cpuCores: 10, cpuBenchmark: 10_000,
      gpuType: "INTEGRATED", gpuModel: null, gpuVRAMGb: null, gpuTgpW: null,
      ramAmountGb: 16, ramUpgradeable: false, storageAmountGb: 512,
      displaySizeIn: 14, displayRefreshHz: 120, displayPanelType: "OLED", displayNits: 500,
      batteryWh: 65, batteryLifeHr: 10, weightKg: 1.32,
    }),
    price: 799,
  },
]
