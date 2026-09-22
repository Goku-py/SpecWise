/**
 * Idempotent Laptop -> Product-spine backfill.
 *
 * Usage:
 *   npx tsx prisma/scripts/backfill-spine.ts --dry-run   # read DB, no writes
 *   npx tsx prisma/scripts/backfill-spine.ts --mock      # mock rows, no DB
 *   npx tsx prisma/scripts/backfill-spine.ts             # write (upsert)
 */
import "dotenv/config"
import {
  LaptopProductSpineSchema,
  type LaptopProductSpine,
  type LaptopSpecInput,
  type PortKindValue,
  type SecurityFeatureValue,
  type WireStandardValue,
  type GpuTypeValue,
  type RamDimmTypeValue,
} from "../../src/lib/validation/product"
import { slugify, uniqueSlug } from "../../src/lib/slug"

// ── Pure transforms ────────────────────────────────────────────────────────

/** "2560×1664" | "1920x1080" | "1920 x 1080" -> { width, height } */
export function parseDisplayResolution(
  raw: string | null | undefined
): { width: number; height: number } | null {
  if (!raw) return null
  const m = raw.replace(/\s+/g, "").match(/^(\d{2,5})[x×](\d{2,5})$/i)
  if (!m) return null
  const width = Number(m[1])
  const height = Number(m[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  return { width, height }
}

/** Merge legacy duplicate flags: either true -> true. */
export function mergeDisplayTouch(
  displayTouch: boolean | null | undefined,
  isTouchscreen: boolean | null | undefined
): boolean {
  return Boolean(displayTouch) || Boolean(isTouchscreen)
}

/** Legacy LaptopPrice.price major units -> ProductPrice.priceMinor (* 100). */
export function majorToPriceMinor(priceMajor: number): number {
  if (!Number.isFinite(priceMajor) || priceMajor < 0) {
    throw new Error(`Invalid major price: ${priceMajor}`)
  }
  return Math.round(priceMajor * 100)
}

export function mapGpuType(raw: string | null | undefined): GpuTypeValue {
  const v = (raw ?? "").toLowerCase().trim()
  if (v === "dedicated" || v === "discrete") return "DEDICATED"
  if (v === "hybrid" || v === "optimus") return "HYBRID"
  return "INTEGRATED"
}

const RAM_TYPE_PATTERNS: Array<[RegExp, RamDimmTypeValue]> = [
  [/lpddr5x/i, "LPDDR5X"],
  [/lpddr5/i, "LPDDR5"],
  [/lpddr4x/i, "LPDDR4X"],
  [/lpddr4/i, "LPDDR4X"],
  [/ddr5/i, "DDR5"],
  [/ddr4/i, "DDR4"],
]

export function mapRamType(raw: string | null | undefined): RamDimmTypeValue | null {
  if (!raw) return null
  for (const [re, kind] of RAM_TYPE_PATTERNS) {
    if (re.test(raw)) return kind
  }
  return null
}

function extractCount(text: string): number {
  const m =
    text.match(/[×x]\s*(\d{1,2})\b/i) ||
    text.match(/\b(\d{1,2})\s*[×x]\b/i) ||
    text.match(/\b(\d{1,2})\s*ports?\b/i)
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n >= 1 && n <= 32) return n
  }
  return 1
}

export function mapPort(text: string): {
  kind: PortKindValue
  count: number
  label: string
} {
  const raw = text.trim()
  const t = raw.toLowerCase()
  const count = extractCount(raw)
  const label = raw

  if (/thunderbolt\s*5|tb5/.test(t)) return { kind: "THUNDERBOLT_5", count, label: "" }
  if (/thunderbolt\s*4|tb4/.test(t)) return { kind: "THUNDERBOLT_4", count, label: "" }
  if (/thunderbolt\s*3|tb3/.test(t)) return { kind: "THUNDERBOLT_3", count, label: "" }
  if (/thunderbolt/.test(t)) return { kind: "THUNDERBOLT_4", count, label: "" }
  if (/usb\s*-?\s*4|usb4/.test(t)) return { kind: "USB4", count, label: "" }
  if (/usb\s*-?\s*c|type\s*-?\s*c/.test(t)) return { kind: "USB_C", count, label: "" }
  if (/usb\s*-?\s*a|usb\s*\d/.test(t)) return { kind: "USB_A", count, label: "" }
  if (/hdmi\s*2\.?1/.test(t)) return { kind: "HDMI_2_1", count, label: "" }
  if (/hdmi\s*2\.?0/.test(t)) return { kind: "HDMI_2_0", count, label: "" }
  if (/displayport\s*2\.?1|dp\s*2\.?1/.test(t)) return { kind: "DISPLAYPORT_2_1", count, label: "" }
  if (/displayport\s*1\.?4|dp\s*1\.?4/.test(t)) return { kind: "DISPLAYPORT_1_4", count, label: "" }
  if (/displayport|\bdp\b/.test(t)) return { kind: "DISPLAYPORT_1_4", count, label: "" }
  if (/rj-?45|ethernet|\blan\b/.test(t)) return { kind: "RJ45", count, label: "" }
  if (/3\.?5\s*mm|headphone|audio\s*jack|audio\s*combo/.test(t)) return { kind: "AUDIO_JACK", count, label: "" }
  if (/\bsd\s*card|sdxc|sdhc|microsd/.test(t)) return { kind: "SD_CARD", count, label: "" }
  if (/m\.?2/.test(t)) return { kind: "M_2", count, label: "" }
  if (/pcie\s*x16/.test(t)) return { kind: "PCIE_X16", count, label: "" }
  if (/pcie\s*x4/.test(t)) return { kind: "PCIE_X4", count, label: "" }
  if (/\bsata\b/.test(t)) return { kind: "SATA", count, label: "" }
  if (/c14|power\s*inlet/.test(t)) return { kind: "POWER_C14", count, label: "" }
  // Bare HDMI without version — do not invent a generation.
  if (/^hdmi\b/.test(t)) return { kind: "OTHER", count, label }
  return { kind: "OTHER", count, label }
}

export function mapSecurity(text: string): {
  feature: SecurityFeatureValue
  label: string
} {
  const raw = text.trim()
  const t = raw.toLowerCase()
  if (/finger|touch\s*id/.test(t)) return { feature: "FINGERPRINT", label: "" }
  if (/tpm/.test(t)) return { feature: "TPM_2_0", label: "" }
  if (/\bir\b|infrared/.test(t)) return { feature: "IR_CAM", label: "" }
  if (/kensington|lock\s*slot/.test(t)) return { feature: "KENSINGTON", label: "" }
  if (/smart\s*card/.test(t)) return { feature: "SMART_CARD", label: "" }
  return { feature: "OTHER", label: raw }
}

export function mapWireless(raw: string | null | undefined): Array<{ wire: WireStandardValue }> {
  if (!raw) return []
  const t = raw.toLowerCase()
  const out: Array<{ wire: WireStandardValue }> = []
  if (/wi-?fi\s*7|802\.11be/.test(t)) out.push({ wire: "WIFI_7" })
  else if (/wi-?fi\s*6e/.test(t)) out.push({ wire: "WIFI_6E" })
  else if (/wi-?fi\s*6|802\.11ax/.test(t)) out.push({ wire: "WIFI_6" })
  if (/bluetooth\s*5\.?4/.test(t)) out.push({ wire: "BLUETOOTH_5_4" })
  else if (/bluetooth\s*5\.?3/.test(t)) out.push({ wire: "BLUETOOTH_5_3" })
  else if (/bluetooth\s*5\.?2/.test(t)) out.push({ wire: "BLUETOOTH_5_2" })
  return out
}

export function dedupePorts(
  ports: Array<{ kind: PortKindValue; count: number; label: string }>
): Array<{ kind: PortKindValue; count: number; label: string }> {
  const map = new Map<string, { kind: PortKindValue; count: number; label: string }>()
  for (const p of ports) {
    const key = p.kind + "\0" + p.label
    const prev = map.get(key)
    if (prev) prev.count += p.count
    else map.set(key, { ...p })
  }
  return [...map.values()]
}

export function dedupeSecurity(
  rows: Array<{ feature: SecurityFeatureValue; label: string }>
): Array<{ feature: SecurityFeatureValue; label: string }> {
  const map = new Map<string, { feature: SecurityFeatureValue; label: string }>()
  for (const r of rows) {
    map.set(r.feature + "\0" + r.label, { ...r })
  }
  return [...map.values()]
}

// ── Row shapes ─────────────────────────────────────────────────────────────

export interface LegacyPriceRow {
  region: string
  retailer: string
  currency: string
  price: number
  url: string | null
  affiliateUrl: string | null
  inStock?: boolean
  validUntil?: Date | string | null
}

export interface LegacyLaptopRow {
  id: string
  brand: string
  model: string
  variant: string | null
  slug: string | null
  status: string
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
  isTouchscreen: boolean
  batteryCapacity: number | null
  batteryLife: number | null
  weight: number | null
  buildMaterial: string | null
  webcamQuality: string | null
  ports: string[]
  wireless: string | null
  securityFeatures: string[]
  keyboardBacklit: boolean
  isPopular: boolean
  imageUrl: string | null
  reviewScore: number | null
  notes: string | null
  brandId: string | null
  prices?: LegacyPriceRow[]
}

export function buildSpineFromLaptop(
  laptop: LegacyLaptopRow,
  usedSlugs: Set<string>
): LaptopProductSpine {
  const baseSlug =
    laptop.slug || slugify(`${laptop.brand}-${laptop.model}-${laptop.variant ?? ""}`)
  const slug =
    laptop.slug && !usedSlugs.has(laptop.slug)
      ? laptop.slug
      : uniqueSlug(baseSlug, usedSlugs)
  usedSlugs.add(slug)

  const res = parseDisplayResolution(laptop.displayResolution)
  const ports = dedupePorts((laptop.ports ?? []).map(mapPort))
  const security = dedupeSecurity((laptop.securityFeatures ?? []).map(mapSecurity))
  const wires = mapWireless(laptop.wireless)

  const laptopSpec: LaptopSpecInput = {
    productId: "",
    os: laptop.os,
    cpuProductId: null,
    gpuProductId: null,
    cpuBrand: laptop.cpuBrand,
    cpuFamily: laptop.cpuFamily,
    cpuGeneration: laptop.cpuGeneration,
    cpuCores: laptop.cpuCores,
    cpuThreads: null,
    cpuBenchmark: laptop.cpuBenchmark,
    benchmarkSource: null,
    gpuType: mapGpuType(laptop.gpuType),
    gpuModel: laptop.gpuModel,
    gpuVRAMGb: laptop.gpuVRAM,
    gpuTgpW: null,
    ramAmountGb: laptop.ramAmount,
    ramType: mapRamType(laptop.ramType),
    ramUpgradeable: laptop.ramUpgradeable,
    storageAmountGb: laptop.storageAmount,
    storageType: laptop.storageType,
    storageExpandable: laptop.storageExpandable,
    displaySizeIn: laptop.displaySize,
    displayWidthPx: res?.width ?? null,
    displayHeightPx: res?.height ?? null,
    displayRefreshHz: laptop.displayRefreshRate,
    displayPanelType: laptop.displayPanelType,
    displayNits: laptop.displayBrightness,
    displayGamut: laptop.displayColorGamut,
    displayTouch: mergeDisplayTouch(laptop.displayTouch, laptop.isTouchscreen),
    batteryWh: laptop.batteryCapacity,
    batteryLifeHr: laptop.batteryLife,
    weightKg: laptop.weight,
    buildMaterial: laptop.buildMaterial,
    webcam: laptop.webcamQuality,
    keyboardBacklit: laptop.keyboardBacklit,
    ports,
    wires,
    security,
  }

  const spine = {
    brand: {
      name: laptop.brand,
      slug: slugify(laptop.brand),
      logoUrl: null,
    },
    product: {
      category: "LAPTOP" as const,
      brandId: laptop.brandId ?? "",
      brandLabel: laptop.brand,
      name: laptop.model,
      variant: laptop.variant,
      slug,
      status: (laptop.status === "archived" ? "archived" : "active") as "active" | "archived",
      isPopular: laptop.isPopular,
      imageUrl: laptop.imageUrl,
      reviewScore: laptop.reviewScore,
      notes: laptop.notes,
      dataSource: "seed" as const,
      sourceUpdatedAt: null,
      legacyLaptopId: laptop.id,
    },
    laptopSpec,
    prices: (laptop.prices ?? []).map(p => ({
      productId: laptop.id,
      region: p.region,
      retailer: p.retailer,
      currency: p.currency,
      priceMinor: majorToPriceMinor(p.price),
      url: p.url,
      affiliateUrl: p.affiliateUrl,
      inStock: p.inStock ?? true,
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString() : null,
    })),
  }

  return LaptopProductSpineSchema.parse(spine)
}

// ── Mock data ──────────────────────────────────────────────────────────────

export const MOCK_LAPTOPS: LegacyLaptopRow[] = [
  {
    id: "Apple-MacBook Air M3",
    brand: "Apple",
    model: "MacBook Air M3",
    variant: null,
    slug: "apple-macbook-air-m3",
    status: "active",
    os: "macOS",
    cpuBrand: "Apple",
    cpuFamily: "M3",
    cpuGeneration: null,
    cpuCores: 8,
    cpuBenchmark: null,
    gpuType: "integrated",
    gpuModel: "Apple 8-core GPU",
    gpuVRAM: null,
    ramAmount: 16,
    ramType: "LPDDR5",
    ramUpgradeable: false,
    storageAmount: 512,
    storageType: "SSD",
    storageExpandable: false,
    displaySize: 13.6,
    displayResolution: "2560x1664",
    displayRefreshRate: 60,
    displayPanelType: "Liquid Retina",
    displayBrightness: 500,
    displayColorGamut: "P3",
    displayTouch: false,
    isTouchscreen: false,
    batteryCapacity: 53,
    batteryLife: 18,
    weight: 1.24,
    buildMaterial: "Aluminum",
    webcamQuality: "1080p",
    ports: ["USB-C x2", "3.5mm headphone jack"],
    wireless: "Wi-Fi 6E, Bluetooth 5.3",
    securityFeatures: ["Fingerprint reader"],
    keyboardBacklit: true,
    isPopular: true,
    imageUrl: null,
    reviewScore: 9.1,
    notes: null,
    brandId: null,
    prices: [
      {
        region: "US",
        retailer: "amazon",
        currency: "USD",
        price: 1099,
        url: null,
        affiliateUrl: null,
        inStock: true,
        validUntil: null,
      },
      {
        region: "IN",
        retailer: "flipkart",
        currency: "INR",
        price: 119900,
        url: null,
        affiliateUrl: null,
        inStock: true,
        validUntil: null,
      },
    ],
  },
  {
    id: "ASUS-ROG Zephyrus G14-2024",
    brand: "ASUS",
    model: "ROG Zephyrus G14",
    variant: "2024",
    slug: "asus-rog-zephyrus-g14-2024",
    status: "active",
    os: "Windows 11",
    cpuBrand: "AMD",
    cpuFamily: "Ryzen 9 8945HS",
    cpuGeneration: "Hawk Point",
    cpuCores: 8,
    cpuBenchmark: 18500,
    gpuType: "dedicated",
    gpuModel: "RTX 4070",
    gpuVRAM: 8,
    ramAmount: 32,
    ramType: "LPDDR5X",
    ramUpgradeable: false,
    storageAmount: 1000,
    storageType: "SSD",
    storageExpandable: true,
    displaySize: 14,
    displayResolution: "2560 x 1600",
    displayRefreshRate: 120,
    displayPanelType: "OLED",
    displayBrightness: 500,
    displayColorGamut: "DCI-P3",
    displayTouch: true,
    isTouchscreen: false,
    batteryCapacity: 73,
    batteryLife: 10,
    weight: 1.5,
    buildMaterial: "Magnesium-alloy",
    webcamQuality: "1080p",
    ports: ["USB4", "USB-C x2", "USB-A", "HDMI 2.1", "microSD", "3.5mm jack"],
    wireless: "Wi-Fi 6E, Bluetooth 5.3",
    securityFeatures: ["TPM 2.0", "Kensington lock slot"],
    keyboardBacklit: true,
    isPopular: true,
    imageUrl: null,
    reviewScore: 8.8,
    notes: null,
    brandId: null,
    prices: [
      {
        region: "US",
        retailer: "best-buy",
        currency: "USD",
        price: 1599,
        url: null,
        affiliateUrl: null,
        inStock: true,
        validUntil: null,
      },
    ],
  },
]

// ── Writer ─────────────────────────────────────────────────────────────────

export interface BackfillResult {
  dryRun: boolean
  mock: boolean
  read: number
  productsUpserted: number
  pricesUpserted: number
  errors: Array<{ id: string; message: string }>
}

function laptopSpecCreate(spec: LaptopSpecInput) {
  const { ports, wires, security, productId: _pid, ...rest } = spec
  return {
    ...rest,
    cpuProductId: spec.cpuProductId ?? null,
    gpuProductId: spec.gpuProductId ?? null,
    ports: {
      create: ports.map(p => ({ kind: p.kind, count: p.count, label: p.label })),
    },
    wires: { create: wires.map(w => ({ wire: w.wire })) },
    security: { create: security.map(s => ({ feature: s.feature, label: s.label })) },
  }
}

export async function runBackfill(opts: {
  dryRun: boolean
  mock: boolean
  laptops?: LegacyLaptopRow[]
}): Promise<BackfillResult> {
  const result: BackfillResult = {
    dryRun: opts.dryRun || opts.mock,
    mock: opts.mock,
    read: 0,
    productsUpserted: 0,
    pricesUpserted: 0,
    errors: [],
  }

  if (opts.mock || opts.laptops) {
    const rows = opts.laptops ?? MOCK_LAPTOPS
    result.read = rows.length
    const usedSlugs = new Set<string>()
    for (const laptop of rows) {
      try {
        const spine = buildSpineFromLaptop(laptop, usedSlugs)
        result.productsUpserted++
        result.pricesUpserted += spine.prices.length
      } catch (e) {
        result.errors.push({
          id: laptop.id,
          message: e instanceof Error ? e.message : String(e),
        })
      }
    }
    return result
  }

  const { PrismaClient } = await import("../../src/generated/prisma/client")
  const { PrismaPg } = await import("@prisma/adapter-pg")
  const pg = (await import("pg")).default
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const rows = (await prisma.laptop.findMany({
      include: { prices: true },
      orderBy: { createdAt: "asc" },
    })) as unknown as LegacyLaptopRow[]
    result.read = rows.length

    const usedSlugs = new Set<string>()
    // Only write mode needs the existing Product slugs (collision-free slugs).
    // A dry-run must not require the spine tables to exist — they are not
    // migrated on every environment — so it validates the transforms instead.
    if (!opts.dryRun) {
      const existing = await prisma.product.findMany({ select: { slug: true } })
      for (const e of existing) usedSlugs.add(e.slug)
    }

    for (const laptop of rows) {
      try {
        const spine = buildSpineFromLaptop(laptop, usedSlugs)

        if (opts.dryRun) {
          result.productsUpserted++
          result.pricesUpserted += spine.prices.length
          continue
        }

        const brand = await prisma.brand.upsert({
          where: { name: spine.brand.name },
          update: { slug: spine.brand.slug },
          create: spine.brand,
        })

        const product = await prisma.product.upsert({
          where: { legacyLaptopId: laptop.id },
          update: {
            brandId: brand.id,
            brandLabel: spine.product.brandLabel,
            name: spine.product.name,
            variant: spine.product.variant,
            slug: spine.product.slug,
            status: spine.product.status,
            isPopular: spine.product.isPopular,
            imageUrl: spine.product.imageUrl,
            reviewScore: spine.product.reviewScore,
            notes: spine.product.notes,
            laptop: {
              upsert: {
                create: laptopSpecCreate(spine.laptopSpec),
                update: laptopSpecCreate(spine.laptopSpec),
              },
            },
          },
          create: {
            ...spine.product,
            brandId: brand.id,
            laptop: { create: laptopSpecCreate(spine.laptopSpec) },
          },
        })

        const specId = product.id
        await prisma.laptopPort.deleteMany({ where: { laptopId: specId } })
        await prisma.laptopWireless.deleteMany({ where: { laptopId: specId } })
        await prisma.laptopSecurity.deleteMany({ where: { laptopId: specId } })
        if (spine.laptopSpec.ports.length) {
          await prisma.laptopPort.createMany({
            data: spine.laptopSpec.ports.map(p => ({
              laptopId: specId,
              kind: p.kind,
              count: p.count,
              label: p.label,
            })),
          })
        }
        if (spine.laptopSpec.wires.length) {
          await prisma.laptopWireless.createMany({
            data: spine.laptopSpec.wires.map(w => ({ laptopId: specId, wire: w.wire })),
          })
        }
        if (spine.laptopSpec.security.length) {
          await prisma.laptopSecurity.createMany({
            data: spine.laptopSpec.security.map(s => ({
              laptopId: specId,
              feature: s.feature,
              label: s.label,
            })),
          })
        }

        for (const p of spine.prices) {
          await prisma.productPrice.upsert({
            where: {
              productId_region_retailer: {
                productId: product.id,
                region: p.region,
                retailer: p.retailer,
              },
            },
            update: {
              currency: p.currency,
              priceMinor: p.priceMinor,
              url: p.url,
              affiliateUrl: p.affiliateUrl,
              inStock: p.inStock ?? true,
              validUntil: p.validUntil,
            },
            create: {
              productId: product.id,
              region: p.region,
              retailer: p.retailer,
              currency: p.currency,
              priceMinor: p.priceMinor,
              url: p.url,
              affiliateUrl: p.affiliateUrl,
              inStock: p.inStock ?? true,
              validUntil: p.validUntil,
            },
          })
          result.pricesUpserted++
        }

        result.productsUpserted++
      } catch (e) {
        result.errors.push({
          id: laptop.id,
          message: e instanceof Error ? e.message : String(e),
        })
      }
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }

  return result
}

// ── CLI ────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2)
  const mock = argv.includes("--mock")
  const dryRun = mock || argv.includes("--dry-run")

  if (mock) console.log("dry-run (mock data, no DB)")
  else if (dryRun) console.log("dry-run (DB read only, no writes)")
  else console.log("write mode — upserting Product spine")

  const result = await runBackfill({ dryRun, mock })

  console.log(
    `read=${result.read} products=${result.productsUpserted} prices=${result.pricesUpserted} errors=${result.errors.length}`
  )
  for (const err of result.errors) {
    console.error(`  FAIL ${err.id}: ${err.message}`)
  }
  if (result.errors.length > 0) process.exitCode = 1
  else console.log(dryRun ? "dry-run OK (Zod parse passed)" : "backfill complete")
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  /backfill-spine\.(ts|js|mjs)$/.test(process.argv[1].replace(/\\/g, "/"))

if (isMain) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
