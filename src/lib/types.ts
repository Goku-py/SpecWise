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
  isActive: boolean
  isPopular: boolean
  imageUrl: string | null
  reviewScore: number | null
  notes: string | null
  retailers: RetailerPrice[]
}

export type QuestionMode = "simple" | "advanced"
