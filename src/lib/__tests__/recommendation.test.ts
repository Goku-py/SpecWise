import { describe, expect, it } from "vitest"
import {
  calculateBuildScore,
  detectBottlenecks,
  resolveWeights,
  DEFAULT_WEIGHTS,
  type ScoreableProduct,
} from "@/lib/recommendation"
import type { LaptopSpecInput } from "@/lib/validation/product"
import { useQuizStore, BUDGET_BANDS, productInBand } from "@/store/useQuizStore"

// ── fixtures ──────────────────────────────────────────────────────────────

function laptopSpec(over: Partial<LaptopSpecInput> = {}): LaptopSpecInput {
  return {
    os: "Windows",
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
    storageExpandable: false,
    displaySizeIn: 15.6,
    displayWidthPx: 1920,
    displayHeightPx: 1080,
    displayRefreshHz: 144,
    displayPanelType: "IPS",
    displayNits: 350,
    displayGamut: null,
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

function product(over: {
  spec?: Partial<LaptopSpecInput>
  price?: number | null
  id?: string
}): ScoreableProduct {
  return {
    product: { id: over.id ?? "p1", name: "Test Laptop", brandLabel: "Acme", category: "LAPTOP" },
    laptopSpec: laptopSpec(over.spec),
    price: over.price === undefined ? 999 : over.price,
  }
}

// ── calculateBuildScore ───────────────────────────────────────────────────

describe("calculateBuildScore", () => {
  it("returns score in [0,1] and weights summing to 1", () => {
    const r = calculateBuildScore(product({}))
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(1)
    const w = r.weights
    const sum = w.performancePerDollar + w.thermalEfficiency + w.displayQuality + w.portability
    expect(sum).toBeCloseTo(1, 6)
  })

  it("higher perf/lower price beats weaker build at same price", () => {
    const strong = calculateBuildScore(
      product({ spec: { cpuCores: 16, cpuBenchmark: 18_000, gpuVRAMGb: 12, ramAmountGb: 32 }, price: 999 })
    )
    const weak = calculateBuildScore(
      product({ spec: { cpuCores: 4, cpuBenchmark: 3_000, gpuType: "INTEGRATED", gpuVRAMGb: null, ramAmountGb: 8 }, price: 999 })
    )
    expect(strong.score).toBeGreaterThan(weak.score)
  })

  it("cheaper product with same specs scores higher on performance/dollar", () => {
    const cheap = calculateBuildScore(product({ price: 500 }))
    const pricey = calculateBuildScore(product({ price: 2500 }))
    expect(cheap.breakdown.performancePerDollar).toBeGreaterThan(pricey.breakdown.performancePerDollar)
    expect(cheap.score).toBeGreaterThan(pricey.score)
  })

  it("better display raises displayQuality", () => {
    const basic = calculateBuildScore(product({ spec: { displayRefreshHz: 60, displayPanelType: "TN", displayNits: 250 } }))
    const vivid = calculateBuildScore(product({ spec: { displayRefreshHz: 165, displayPanelType: "OLED", displayNits: 500 } }))
    expect(vivid.breakdown.displayQuality).toBeGreaterThan(basic.breakdown.displayQuality)
  })

  it("lighter + longer battery raises portability", () => {
    const heavy = calculateBuildScore(product({ spec: { weightKg: 2.8, batteryLifeHr: 4 } }))
    const light = calculateBuildScore(product({ spec: { weightKg: 1.1, batteryLifeHr: 14 } }))
    expect(light.breakdown.portability).toBeGreaterThan(heavy.breakdown.portability)
  })

  it("missing price does not NaN — neutral perf/dollar", () => {
    const r = calculateBuildScore(product({ price: null }))
    expect(Number.isFinite(r.score)).toBe(true)
    expect(r.breakdown.performancePerDollar).toBe(0.5)
  })

  it("prioritizePortability shifts weights toward portability", () => {
    const base = calculateBuildScore(product({}), {})
    const port = calculateBuildScore(product({}), { prioritizePortability: true })
    expect(port.weights.portability).toBeGreaterThan(base.weights.portability)
    const sum =
      port.weights.performancePerDollar +
      port.weights.thermalEfficiency +
      port.weights.displayQuality +
      port.weights.portability
    expect(sum).toBeCloseTo(1, 6)
  })

  it("malformed custom weights fall back to defaults that sum to 1", () => {
    const w = resolveWeights({ performancePerDollar: -1 })
    const sum = w.performancePerDollar + w.thermalEfficiency + w.displayQuality + w.portability
    expect(sum).toBeCloseTo(1, 6)
    expect(w.performancePerDollar).toBeCloseTo(DEFAULT_WEIGHTS.performancePerDollar, 6)
  })
})

// ── detectBottlenecks ─────────────────────────────────────────────────────

describe("detectBottlenecks", () => {
  it("flags VRAM < 8GB at 1440p", () => {
    const b = detectBottlenecks(product({ spec: { gpuType: "DEDICATED", gpuVRAMGb: 6 } }), { resolution: "1440p" })
    expect(b.map(x => x.code)).toContain("VRAM_BELOW_8GB_1440P")
  })

  it("flags VRAM < 12GB at 4K (even if ≥8)", () => {
    const b = detectBottlenecks(product({ spec: { gpuType: "DEDICATED", gpuVRAMGb: 8 } }), { resolution: "4K" })
    expect(b.map(x => x.code)).toContain("VRAM_BELOW_12GB_4K")
  })

  it("no VRAM warning when sufficient for resolution", () => {
    const b = detectBottlenecks(product({ spec: { gpuType: "DEDICATED", gpuVRAMGb: 12 } }), { resolution: "4K" })
    expect(b.map(x => x.code)).not.toContain("VRAM_BELOW_12GB_4K")
    const b1440 = detectBottlenecks(product({ spec: { gpuType: "DEDICATED", gpuVRAMGb: 8 } }), { resolution: "1440p" })
    expect(b1440.map(x => x.code)).not.toContain("VRAM_BELOW_8GB_1440P")
  })

  it("flags high TDP + small battery tradeoff", () => {
    const b = detectBottlenecks(product({ spec: { gpuTgpW: 140, batteryWh: 50 } }))
    expect(b.map(x => x.code)).toContain("HIGH_TDP_LOW_BATTERY")
  })

  it("flags non-upgradeable RAM", () => {
    const b = detectBottlenecks(product({ spec: { ramUpgradeable: false } }))
    expect(b.map(x => x.code)).toContain("RAM_NOT_UPGRADEABLE")
  })

  it("clean build produces no bottlenecks", () => {
    const b = detectBottlenecks(
      product({ spec: { gpuType: "DEDICATED", gpuVRAMGb: 12, gpuTgpW: 80, batteryWh: 90, ramUpgradeable: true } }),
      { resolution: "1440p" }
    )
    expect(b).toHaveLength(0)
  })
})

// ── store ─────────────────────────────────────────────────────────────────

describe("useQuizStore", () => {
  it("setAnswer updates a single key", () => {
    const store = useQuizStore.getState()
    store.setAnswer("primaryWorkload", "gaming")
    expect(useQuizStore.getState().primaryWorkload).toBe("gaming")
    useQuizStore.getState().reset()
    expect(useQuizStore.getState().primaryWorkload).toBeNull()
  })

  it("filterByBudgetBand keeps only in-band priced products", () => {
    const cheap = product({ id: "cheap", price: 500 })
    const mid = product({ id: "mid", price: 1000 })
    const rich = product({ id: "rich", price: 2000 })
    const noPrice = product({ id: "nop", price: null })

    useQuizStore.getState().reset()
    // no band → everything
    expect(useQuizStore.getState().filterByBudgetBand([cheap, mid, rich, noPrice])).toHaveLength(4)

    useQuizStore.getState().setAnswer("budgetBandId", "700-1199")
    const filtered = useQuizStore.getState().filterByBudgetBand([cheap, mid, rich, noPrice])
    expect(filtered.map(p => p.product.id)).toEqual(["mid"])
  })

  it("computeTopRecommendations sorts by score desc and respects topN", () => {
    const weak = product({ id: "weak", spec: { cpuCores: 4, gpuType: "INTEGRATED", ramAmountGb: 8 }, price: 999 })
    const strong = product({ id: "strong", spec: { cpuCores: 16, gpuVRAMGb: 12, cpuBenchmark: 20_000 }, price: 999 })
    const mid = product({ id: "mid", price: 999 })

    useQuizStore.getState().reset()
    const top = useQuizStore.getState().computeTopRecommendations([weak, strong, mid], 2)
    expect(top).toHaveLength(2)
    expect(top[0]!.product.id).toBe("strong")
    expect(top.map(p => p.product.id)).not.toContain("weak")
  })

  it("productInBand: open bands and missing price", () => {
    const band = BUDGET_BANDS.find(b => b.id === "1800+")!
    expect(productInBand(product({ price: 2500 }), band)).toBe(true)
    expect(productInBand(product({ price: 1000 }), band)).toBe(false)
    expect(productInBand(product({ price: null }), band)).toBe(false)
    expect(productInBand(product({ price: null }), null)).toBe(true)
  })

  it("selectWorkload maps intent → primaryWorkload", () => {
    useQuizStore.getState().reset()
    useQuizStore.getState().selectWorkload("ai-ml")
    expect(useQuizStore.getState().workloadIntent).toBe("ai-ml")
    expect(useQuizStore.getState().primaryWorkload).toBe("code")
    useQuizStore.getState().selectWorkload("esports")
    expect(useQuizStore.getState().primaryWorkload).toBe("gaming")
    useQuizStore.getState().reset()
  })

  it("budgetMax caps upper price; open at BUDGET_OPEN_MAX", () => {
    const cheap = product({ id: "c", price: 600 })
    const mid = product({ id: "m", price: 1100 })
    const rich = product({ id: "r", price: 2500 })
    const noPrice = product({ id: "n", price: null })

    useQuizStore.getState().reset()
    useQuizStore.getState().setAnswer("budgetMax", 1200)
    const capped = useQuizStore.getState().filterByBudgetBand([cheap, mid, rich, noPrice])
    expect(capped.map(p => p.product.id)).toEqual(["c", "m"])

    useQuizStore.getState().setAnswer("budgetMax", 3000) // open → no upper cap
    const open = useQuizStore.getState().filterByBudgetBand([cheap, mid, rich, noPrice])
    // no band + open max → all four (missing price only fails a real cap)
    expect(open).toHaveLength(4)
    useQuizStore.getState().reset()
  })

  it("upgradeability must filters soldered RAM only", () => {
    const upgradable = product({ id: "up", spec: { ramUpgradeable: true } })
    const soldered = product({ id: "sd", spec: { ramUpgradeable: false } })

    useQuizStore.getState().reset()
    useQuizStore.getState().setAnswer("upgradeabilityPreference", "must")
    const filtered = useQuizStore.getState().filterByBudgetBand([upgradable, soldered])
    expect(filtered.map(p => p.product.id)).toEqual(["up"])
    useQuizStore.getState().reset()
  })
})
