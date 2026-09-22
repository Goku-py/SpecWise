import { describe, expect, it } from "vitest"
import { pickBestOffer, toScorable, type CatalogEntry } from "@/lib/catalog-cache"

const NOW = Date.now()
const FUTURE = new Date(NOW + 30 * 24 * 3600 * 1000)
const PAST = new Date(NOW - 30 * 24 * 3600 * 1000)

function row(price: number, over: Partial<{ inStock: boolean; validUntil: Date | null }> = {}) {
  return {
    laptopId: "l1",
    region: "US",
    retailer: "amazon",
    currency: "USD",
    price,
    url: null,
    affiliateUrl: null,
    inStock: over.inStock ?? true,
    validUntil: over.validUntil ?? null,
  }
}

describe("pickBestOffer", () => {
  it("prefers the cheapest valid offer", () => {
    const { best, stale } = pickBestOffer([row(1200), row(999), row(1500)], NOW)
    expect(best?.price).toBe(999)
    expect(stale).toBe(false)
  })

  it("skips out-of-stock and expired rows for a valid one", () => {
    const { best, stale } = pickBestOffer(
      [row(500, { inStock: false }), row(700, { validUntil: PAST }), row(900)],
      NOW
    )
    expect(best?.price).toBe(900)
    expect(stale).toBe(false)
  })

  it("falls back to the cheapest stale row with stale=true (never missing, never zero)", () => {
    const { best, stale } = pickBestOffer(
      [row(500, { inStock: false }), row(700, { validUntil: PAST })],
      NOW
    )
    expect(best?.price).toBe(500)
    expect(stale).toBe(true)
  })

  it("returns null (caller flags priceMissing) only when no rows exist", () => {
    expect(pickBestOffer([], NOW)).toEqual({ best: null, stale: false })
  })

  it("treats unparseable validUntil as stale, not valid", () => {
    const { best, stale } = pickBestOffer(
      [{ ...row(400), validUntil: "not-a-date" as unknown as Date }],
      NOW
    )
    expect(best?.price).toBe(400)
    expect(stale).toBe(true)
  })

  it("accepts ISO string dates", () => {
    const { best, stale } = pickBestOffer(
      [{ ...row(400), validUntil: FUTURE.toISOString() }],
      NOW
    )
    expect(best?.price).toBe(400)
    expect(stale).toBe(false)
  })
})

function entry(prices: ReturnType<typeof row>[]): CatalogEntry {
  return {
    id: "l1",
    brand: "Test",
    model: "Model",
    variant: null,
    slug: "test-model",
    status: "active",
    brandId: null,
    os: "Windows",
    cpuBrand: "Intel",
    cpuFamily: "Core",
    cpuGeneration: null,
    cpuCores: 8,
    gpuType: "integrated",
    gpuModel: null,
    gpuVRAM: null,
    ramAmount: 16,
    ramUpgradeable: false,
    storageAmount: 512,
    storageType: "SSD",
    storageExpandable: false,
    displaySize: 14,
    displayResolution: null,
    displayRefreshRate: 60,
    displayPanelType: null,
    displayBrightness: null,
    displayColorGamut: null,
    displayTouch: false,
    batteryCapacity: null,
    batteryLife: 8,
    weight: 1.7,
    buildMaterial: null,
    webcamQuality: null,
    ports: [],
    wireless: null,
    securityFeatures: [],
    keyboardBacklit: false,
    isTouchscreen: false,
    isRefurbished: false,
    isPopular: false,
    imageUrl: null,
    reviewScore: null,
    notes: null,
    dataSource: "seed",
    sourceUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    prices,
  } as unknown as CatalogEntry
}

describe("toScorable offer state", () => {
  it("selects the cheapest valid offer with priceStale=false", () => {
    const s = toScorable(entry([row(1200), row(999), row(1500)]), "US")
    expect(s.price).toBe(999)
    expect(s.priceMissing).toBe(false)
    expect(s.priceStale).toBe(false)
  })

  it("marks stale fallback explicitly and preserves the real price", () => {
    const s = toScorable(entry([row(500, { inStock: false })]), "US")
    expect(s.price).toBe(500)
    expect(s.priceMissing).toBe(false)
    expect(s.priceStale).toBe(true)
  })

  it("missing rows stay priceMissing with no fake zero advantage", () => {
    const s = toScorable(entry([]), "US")
    expect(s.price).toBe(0)
    expect(s.priceMissing).toBe(true)
  })

  it("retailers carry offer state through", () => {
    const s = toScorable(entry([row(999, { inStock: false })]), "US")
    expect(s.retailers[0]).toMatchObject({ retailer: "amazon", price: 999, inStock: false })
  })
})
