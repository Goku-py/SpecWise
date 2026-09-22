/**
 * Zod mirrors of the Product-spine Prisma enums/models (prisma/schema.prisma).
 *
 * Kept as local const objects (not prisma generate imports) so app code and
 * tests can validate without loading the generated client. When a Prisma enum
 * changes, update the matching const + schema here in the same commit.
 */
import { z } from "zod"

// ── Enums (sync with prisma/schema.prisma) ────────────────────────────────

export const Status = {
  draft: "draft",
  active: "active",
  archived: "archived",
} as const
export const StatusSchema = z.nativeEnum(Status)

export const Category = {
  LAPTOP: "LAPTOP",
  CPU: "CPU",
  GPU: "GPU",
  MOTHERBOARD: "MOTHERBOARD",
  RAM: "RAM",
  PSU: "PSU",
} as const
export const CategorySchema = z.nativeEnum(Category)

export const GpuType = {
  INTEGRATED: "INTEGRATED",
  DEDICATED: "DEDICATED",
  HYBRID: "HYBRID",
} as const
export const GpuTypeSchema = z.nativeEnum(GpuType)

export const RamDimmType = {
  DDR4: "DDR4",
  DDR5: "DDR5",
  LPDDR4X: "LPDDR4X",
  LPDDR5: "LPDDR5",
  LPDDR5X: "LPDDR5X",
} as const
export const RamDimmTypeSchema = z.nativeEnum(RamDimmType)

export const PsuModularity = {
  NON_MODULAR: "NON_MODULAR",
  SEMI_MODULAR: "SEMI_MODULAR",
  FULL_MODULAR: "FULL_MODULAR",
} as const
export const PsuModularitySchema = z.nativeEnum(PsuModularity)

export const EfficiencyRating = {
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
  PLATINUM: "PLATINUM",
  TITANIUM: "TITANIUM",
} as const
export const EfficiencyRatingSchema = z.nativeEnum(EfficiencyRating)

export const MoboFormFactor = {
  ATX: "ATX",
  MICRO_ATX: "MICRO_ATX",
  MINI_ITX: "MINI_ITX",
  E_ATX: "E_ATX",
} as const
export const MoboFormFactorSchema = z.nativeEnum(MoboFormFactor)

export const WireStandard = {
  WIFI_6: "WIFI_6",
  WIFI_6E: "WIFI_6E",
  WIFI_7: "WIFI_7",
  BLUETOOTH_5_2: "BLUETOOTH_5_2",
  BLUETOOTH_5_3: "BLUETOOTH_5_3",
  BLUETOOTH_5_4: "BLUETOOTH_5_4",
} as const
export const WireStandardSchema = z.nativeEnum(WireStandard)

export const PortKind = {
  USB_A: "USB_A",
  USB_C: "USB_C",
  USB4: "USB4",
  THUNDERBOLT_3: "THUNDERBOLT_3",
  THUNDERBOLT_4: "THUNDERBOLT_4",
  THUNDERBOLT_5: "THUNDERBOLT_5",
  HDMI_2_0: "HDMI_2_0",
  HDMI_2_1: "HDMI_2_1",
  DISPLAYPORT_1_4: "DISPLAYPORT_1_4",
  DISPLAYPORT_2_1: "DISPLAYPORT_2_1",
  RJ45: "RJ45",
  AUDIO_JACK: "AUDIO_JACK",
  SD_CARD: "SD_CARD",
  M_2: "M_2",
  PCIE_X16: "PCIE_X16",
  PCIE_X4: "PCIE_X4",
  SATA: "SATA",
  POWER_C14: "POWER_C14",
  OTHER: "OTHER",
} as const
export const PortKindSchema = z.nativeEnum(PortKind)

export const SecurityFeature = {
  FINGERPRINT: "FINGERPRINT",
  TPM_2_0: "TPM_2_0",
  IR_CAM: "IR_CAM",
  KENSINGTON: "KENSINGTON",
  SMART_CARD: "SMART_CARD",
  OTHER: "OTHER",
} as const
export const SecurityFeatureSchema = z.nativeEnum(SecurityFeature)

export const DatasourceKind = {
  seed: "seed",
  import: "import",
  partner: "partner",
  manual: "manual",
} as const
export const DatasourceKindSchema = z.nativeEnum(DatasourceKind)

// ── Shared scalars ─────────────────────────────────────────────────────────

/** Non-negative safe integer (counts, GB, Hz, etc.). */
export const NonNegIntSchema = z.int().nonnegative()
/** Positive safe integer (wattage, cores, …). */
export const PosIntSchema = z.int().positive()
/** Nullable non-negative int with coercion for form/JSON edges. */
export const optionalInt = z.preprocess(v => {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number") return v
  const n = Number(v)
  return Number.isFinite(n) ? n : v
}, z.int().nonnegative().nullable().default(null))

/**
 * Price in MINOR units only (109900 = $1,099.00). Strict int — rejects
 * floats, strings, and legacy major-unit values above a sane cap.
 */
export const PriceMinorSchema = z
  .int("priceMinor must be an integer (minor units)")
  .nonnegative("priceMinor must be ≥ 0")
  .max(100_000_000_00, "$100M cap in minor units")

export const CurrencySchema = z.string().trim().regex(/^[A-Z]{3}$/, "ISO-4217 uppercase")
export const RegionCodeSchema = z.string().trim().min(2).max(8)
export const SlugSchema = z.string().trim().min(1).max(200)

// ── Models ─────────────────────────────────────────────────────────────────

export const BrandInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: SlugSchema,
  logoUrl: z.string().url().max(2048).nullable().optional(),
})

export const ProductPriceSchema = z.object({
  productId: z.string().min(1),
  region: RegionCodeSchema,
  retailer: z.string().trim().min(1).max(100),
  currency: CurrencySchema,
  priceMinor: PriceMinorSchema,
  url: z.string().url().max(2048).nullable().optional(),
  affiliateUrl: z.string().url().max(2048).nullable().optional(),
  inStock: z.boolean().default(true),
  validUntil: z.iso.datetime().nullable().optional(),
})

export const SpinePriceSnapshotSchema = z.object({
  productId: z.string().min(1),
  retailer: z.string().trim().min(1).max(100),
  region: RegionCodeSchema,
  currency: CurrencySchema,
  priceMinor: PriceMinorSchema,
  inStock: z.boolean().default(true),
  capturedAt: z.iso.datetime().optional(),
})

export const ProductBaseSchema = z.object({
  id: z.string().min(1).optional(),
  category: CategorySchema,
  /** Resolved at write time via Brand upsert — omit/empty in pre-write payloads. */
  brandId: z.string().min(1).optional().or(z.literal("")),
  brandLabel: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  variant: z.string().trim().max(200).nullable().optional(),
  slug: SlugSchema,
  status: StatusSchema.default("active"),
  isPopular: z.boolean().default(false),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  reviewScore: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  dataSource: DatasourceKindSchema.default("seed"),
  sourceUpdatedAt: z.iso.datetime().nullable().optional(),
  legacyLaptopId: z.string().min(1).nullable().optional(),
})

export const LaptopPortSchema = z.object({
  kind: PortKindSchema,
  count: PosIntSchema.default(1),
  label: z.string().max(200).default(""),
})

export const LaptopWirelessSchema = z.object({
  wire: WireStandardSchema,
})

export const LaptopSecuritySchema = z.object({
  feature: SecurityFeatureSchema,
  label: z.string().max(200).default(""),
})

export const LaptopSpecSchema = z.object({
  /** Filled by the writer with Product.id — empty/omit in pre-write payloads. */
  productId: z.string().min(1).optional().or(z.literal("")),
  os: z.string().trim().min(1).max(100),
  cpuProductId: z.string().min(1).nullable().optional(),
  gpuProductId: z.string().min(1).nullable().optional(),
  cpuBrand: z.string().trim().min(1).max(80),
  cpuFamily: z.string().trim().min(1).max(160),
  cpuGeneration: z.string().trim().max(80).nullable().optional(),
  cpuCores: optionalInt,
  cpuThreads: optionalInt,
  cpuBenchmark: optionalInt,
  benchmarkSource: z.string().trim().max(80).nullable().optional(),
  gpuType: GpuTypeSchema.default("INTEGRATED"),
  gpuModel: z.string().trim().max(160).nullable().optional(),
  gpuVRAMGb: optionalInt,
  gpuTgpW: optionalInt,
  ramAmountGb: PosIntSchema,
  ramType: RamDimmTypeSchema.nullable().optional(),
  ramUpgradeable: z.boolean().default(false),
  storageAmountGb: PosIntSchema,
  storageType: z.string().trim().min(1).max(40).default("SSD"),
  storageExpandable: z.boolean().default(false),
  displaySizeIn: z.number().positive(),
  displayWidthPx: optionalInt,
  displayHeightPx: optionalInt,
  displayRefreshHz: PosIntSchema.default(60),
  displayPanelType: z.string().trim().max(60).nullable().optional(),
  displayNits: optionalInt,
  displayGamut: z.string().trim().max(80).nullable().optional(),
  displayTouch: z.boolean().default(false),
  batteryWh: optionalInt,
  batteryLifeHr: optionalInt,
  weightKg: z.number().nonnegative().nullable().optional(),
  buildMaterial: z.string().trim().max(120).nullable().optional(),
  webcam: z.string().trim().max(80).nullable().optional(),
  keyboardBacklit: z.boolean().default(false),
  ports: z.array(LaptopPortSchema).max(64).default([]),
  wires: z.array(LaptopWirelessSchema).max(16).default([]),
  security: z.array(LaptopSecuritySchema).max(32).default([]),
})

export const CpuSpecSchema = z.object({
  productId: z.string().min(1),
  socket: z.string().trim().max(40).nullable().optional(),
  cores: PosIntSchema,
  threads: optionalInt,
  baseClockMHz: optionalInt,
  boostClockMHz: optionalInt,
  tdpW: optionalInt,
  igpuModel: z.string().trim().max(120).nullable().optional(),
  benchmark: optionalInt,
  benchmarkSource: z.string().trim().max(80).nullable().optional(),
  generation: z.string().trim().max(80).nullable().optional(),
})

export const GpuSpecSchema = z.object({
  productId: z.string().min(1),
  chipset: z.string().trim().min(1).max(160),
  vramGb: optionalInt,
  vramType: z.string().trim().max(40).nullable().optional(),
  tgpW: optionalInt,
  computeUnits: optionalInt,
  rtUnits: optionalInt,
  busWidthBit: optionalInt,
  benchmark: optionalInt,
  benchmarkSource: z.string().trim().max(80).nullable().optional(),
})

export const MotherboardSpecSchema = z.object({
  productId: z.string().min(1),
  formFactor: MoboFormFactorSchema,
  chipset: z.string().trim().max(80).nullable().optional(),
  socket: z.string().trim().max(40).nullable().optional(),
  memoryType: RamDimmTypeSchema.nullable().optional(),
  memorySlots: optionalInt,
  memoryMaxGb: optionalInt,
  m2Slots: optionalInt,
  pcieVersion: z.string().trim().max(20).nullable().optional(),
  wifiIncluded: z.boolean().default(false),
})

export const RamSpecSchema = z.object({
  productId: z.string().min(1),
  capacityGb: PosIntSchema,
  dimmType: RamDimmTypeSchema,
  speedMHz: optionalInt,
  casLatency: optionalInt,
  modules: PosIntSchema.default(1),
  channels: optionalInt,
  xmpExpo: z.boolean().default(false),
})

export const PsuSpecSchema = z.object({
  productId: z.string().min(1),
  wattage: PosIntSchema,
  efficiency: EfficiencyRatingSchema.nullable().optional(),
  modularity: PsuModularitySchema.default("NON_MODULAR"),
  formFactor: z.string().trim().max(40).nullable().optional(),
  pcie12vhpwr: z.boolean().default(false),
  fanless: z.boolean().default(false),
})

/** Full spine write payload for one LAPTOP-category product (backfill shape). */
export const LaptopProductSpineSchema = z.object({
  product: ProductBaseSchema.extend({ category: z.literal(Category.LAPTOP) }),
  brand: BrandInputSchema,
  laptopSpec: LaptopSpecSchema,
  prices: z.array(ProductPriceSchema).max(64),
})

export type StatusValue = z.infer<typeof StatusSchema>
export type CategoryValue = z.infer<typeof CategorySchema>
export type GpuTypeValue = z.infer<typeof GpuTypeSchema>
export type RamDimmTypeValue = z.infer<typeof RamDimmTypeSchema>
export type PortKindValue = z.infer<typeof PortKindSchema>
export type SecurityFeatureValue = z.infer<typeof SecurityFeatureSchema>
export type WireStandardValue = z.infer<typeof WireStandardSchema>
export type DatasourceKindValue = z.infer<typeof DatasourceKindSchema>
export type BrandInput = z.infer<typeof BrandInputSchema>
export type ProductBase = z.infer<typeof ProductBaseSchema>
export type ProductPriceInput = z.infer<typeof ProductPriceSchema>
export type LaptopSpecInput = z.infer<typeof LaptopSpecSchema>
export type LaptopProductSpine = z.infer<typeof LaptopProductSpineSchema>
export type CpuSpecInput = z.infer<typeof CpuSpecSchema>
export type GpuSpecInput = z.infer<typeof GpuSpecSchema>
export type MotherboardSpecInput = z.infer<typeof MotherboardSpecSchema>
export type RamSpecInput = z.infer<typeof RamSpecSchema>
export type PsuSpecInput = z.infer<typeof PsuSpecSchema>
