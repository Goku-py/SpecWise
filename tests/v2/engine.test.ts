import { describe, expect, it } from "vitest"
import { scoreLaptops } from "@/lib/scoring"
import { rescoreWithOverlay, weightsForUseCase, type DimName } from "@/lib/decomposition"
import { runEngine, isPriceMissing } from "@/lib/recommendation/engine"
import { toCanonical, type CanonicalAnswers } from "@/lib/recommendation/questionnaire"
import { buildProfile } from "@/lib/recommendation/profile"
import { DIMS_9, SCORING_VERSION, WEIGHTS_VERSION } from "@/lib/recommendation/weights"
import { defaultQuizAnswers, type QuizAnswers, type ScorableLaptop } from "@/lib/types"
import { tinyBudgetHuge, tinyBudgetLow, tinyIntegrated15, tinyMacAir, tinyWindowsPro } from "../scoring/fixtures/tiny"

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return { ...defaultQuizAnswers, ...overrides }
}

let seq = 0
function mkLaptop(overrides: Partial<ScorableLaptop> = {}): ScorableLaptop {
  seq += 1
  return {
    id: overrides.id ?? `test-${seq}`,
    brand: "Test",
    model: "Model",
    variant: null,
    price: 1000,
    currency: "USD",
    region: "US",
    url: null,
    affiliateUrl: null,
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
    displayResolution: "1920x1200",
    displayRefreshRate: 60,
    displayPanelType: "IPS",
    displayBrightness: 350,
    displayColorGamut: null,
    displayTouch: false,
    batteryCapacity: null,
    batteryLife: 8,
    weight: 1.7,
    buildMaterial: "Plastic",
    webcamQuality: null,
    ports: ["usb-a", "hdmi"],
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
    ...overrides,
  }
}

function canon(overrides: Partial<CanonicalAnswers> = {}): CanonicalAnswers {
  return {
    workload: "code", useCase: "coding", region: "US", maxBudget: null, os: null,
    carry: null, powerTrade: null, multitask: null, storageNeed: null, screen: [],
    toughBuild: null, dealMinRam16: false, legacyCpuBrand: null, legacyGpuDedicated: false,
    legacyPorts: [], legacyOsRaw: null, legacyGaming: null, legacyUpgradeMust: false,
    legacyMinRamExact: null, legacyMinStorageExact: null, ...overrides,
  }
}

function engineRun(pool: ScorableLaptop[], c: CanonicalAnswers = canon()) {
  return runEngine(pool, buildProfile(c, null), c)
}

describe("price-unknown invariant", () => {
  it("isPriceMissing flags null/zero/negative but not valid prices", () => {
    expect(isPriceMissing(mkLaptop({ price: 999 }))).toBe(false)
    expect(isPriceMissing(mkLaptop({ price: 0 }))).toBe(true)
    expect(isPriceMissing(mkLaptop({ price: -50 }))).toBe(true)
    expect(isPriceMissing(mkLaptop({ price: 999, priceMissing: true }))).toBe(true)
  })

  it("zero-price laptops cannot satisfy a budget (no fake zero-price advantage)", () => {
    const zero = mkLaptop({ id: "zero", price: 0, ramAmount: 64, cpuCores: 16 })
    const res = scoreLaptops([zero, tinyWindowsPro], answers({ budgetMax: 2000 }))
    expect(res.map(r => r.id)).not.toContain("zero")
  })

  it("without budget, unknown-price laptops are quarantined behind priced passers and flagged", () => {
    const ghost = mkLaptop({ id: "ghost", price: 0, ramAmount: 64, cpuCores: 24, gpuType: "dedicated", gpuVRAM: 16 })
    const res = scoreLaptops([ghost, tinyWindowsPro, tinyMacAir], answers({}))
    const ghostIdx = res.findIndex(r => r.id === "ghost")
    expect(ghostIdx).toBeGreaterThanOrEqual(2)
    expect(res[ghostIdx].priceMissing).toBe(true)
    expect(res[ghostIdx].scoringMeta!.caps.value).toBeNull()
    expect(res[0].priceMissing ?? false).toBe(false)
  })

  it("unknown-price lane holds at most three", () => {
    const pool = [mkLaptop({ id: "priced", model: "Priced", price: 500 })]
    for (let i = 0; i < 5; i++) pool.push(mkLaptop({ id: `ghost-${i}`, model: `Ghost ${i}`, price: 0 }))
    const res = scoreLaptops(pool, answers({}))
    expect(res[0].id).toBe("priced")
    expect(res.filter(r => r.priceMissing).length).toBeLessThanOrEqual(3)
  })

  it("value caps are pool-relative and monotonic in price", () => {
    const pool = [mkLaptop({ id: "cheap", model: "Cheap", price: 500 }), mkLaptop({ id: "mid", model: "Mid", price: 1000 }), mkLaptop({ id: "steep", model: "Steep", price: 2000 })]
    const res = scoreLaptops(pool, answers({}))
    const v = (id: string) => res.find(r => r.id === id)!.scoringMeta!.caps.value!
    expect(v("cheap")).toBe(1)
    expect(v("mid")).toBeGreaterThan(v("steep"))
    expect(v("steep")).toBeCloseTo(0.2, 10)
  })
})

describe("hard constraints (deterministic)", () => {
  const triple = [tinyWindowsPro, tinyBudgetLow, tinyBudgetHuge] // 1499 / 250 / 8500

  it("budget min/max filter exactly", () => {
    const ids = (a: QuizAnswers) => scoreLaptops(triple, a).map(r => r.id)
    expect(ids(answers({ budgetMin: 1000, budgetMax: 2000 }))).toEqual(["tiny-windows-pro"])
    expect(ids(answers({ budgetMax: 1000 }))).toEqual(["tiny-budget-low"])
  })

  it("os matches case-insensitively; linux accepts windows (legacy compat)", () => {
    expect(scoreLaptops([tinyWindowsPro, tinyMacAir], answers({ os: "windows" })).map(r => r.id)).toEqual(["tiny-windows-pro"])
    expect(scoreLaptops([tinyWindowsPro], answers({ os: "linux" })).map(r => r.id)).toEqual(["tiny-windows-pro"])
  })

  it("gpu/cpuBrand/ports constrain exactly", () => {
    expect(scoreLaptops([tinyWindowsPro, tinyIntegrated15], answers({ gpu: "dedicated" })).map(r => r.id)).toEqual(["tiny-windows-pro"])
    const amdLaptop = mkLaptop({ id: "amd-box", model: "AMD Box", cpuBrand: "AMD" })
    expect(scoreLaptops([tinyWindowsPro, amdLaptop], answers({ cpuBrand: "amd" })).map(r => r.id)).toEqual(["amd-box"])
    const noPorts = scoreLaptops([mkLaptop({ ports: [] })], answers({ ports: ["thunderbolt", "ethernet", "sd-card"] }))
    expect(noPorts[0].relaxed).toBe(true) // ports lifted via ledger, never silent
    expect(noPorts[0].relaxationLedger!.map(e => e.requirement)).toContain("ports")
  })

  it("deal-breaker pins RAM even when the question answer is light", () => {
    const c = canon({ multitask: "light", dealMinRam16: true })
    const r = engineRun([mkLaptop({ id: "eight", ramAmount: 8 }), mkLaptop({ id: "sixteen", ramAmount: 16 })], c)
    expect(r.items.map(i => i.laptop.id)).toEqual(["sixteen"])
    expect(r.relaxed).toBe(false)
  })
})

describe("progressive relaxation", () => {
  it("exact matches never relax", () => {
    const res = scoreLaptops([tinyWindowsPro], answers({ useCase: "coding", minRam: 16 }))
    expect(res).toHaveLength(1)
    expect(res[0].relaxed).toBe(false)
    expect(res[0].exhausted).toBe(false)
    expect(res[0].relaxationLedger).toEqual([])
  })

  it("relaxes weakest-first with a ledger entry per step", () => {
    const res = scoreLaptops([tinyIntegrated15], answers({ gpu: "dedicated", minRam: 8 }))
    expect(res).toHaveLength(1)
    expect(res[0].relaxed).toBe(true)
    expect(res[0].relaxationLedger![0]).toMatchObject({ requirement: "gpu" })
    for (const e of res[0].relaxationLedger!) {
      expect(e.requirement.length).toBeGreaterThan(0)
      expect(e.from.length).toBeGreaterThan(0)
      expect(e.reason.length).toBeGreaterThan(0)
    }
  })

  it("caps relaxation at three steps", () => {
    const a = answers({ budgetMin: 1, budgetMax: 1, os: "chromeos", minRam: 1024, minStorage: 8192, gpu: "dedicated", ports: ["x1", "x2", "x3"] })
    const res = scoreLaptops([tinyWindowsPro], a)
    expect(res[0].relaxationLedger!.length).toBeLessThanOrEqual(3)
  })

  it("protected budget/os relaxations are ledgered and flagged on missed entries", () => {
    const res = scoreLaptops([tinyBudgetLow], answers({ budgetMax: 1 }))
    expect(res.length).toBeGreaterThan(0)
    expect(res[0].relaxed).toBe(true)
    expect(res[0].relaxationLedger!.map(e => e.requirement)).toContain("budget")
    expect(res[0].explanation!.missed.find(m => m.id === "budget")?.relaxed).toBe(true)
  })

  it("exhaustion returns flagged closest-misses instead of nothing", () => {
    const a = answers({ budgetMin: 10_000_000, os: "chromeos", minRam: 1024 })
    const res = scoreLaptops([tinyWindowsPro, tinyMacAir], a)
    expect(res.length).toBeGreaterThan(0)
    for (const r of res) {
      expect(r.exhausted).toBe(true)
      expect(r.explanation!.missed.length).toBeGreaterThan(0)
    }
  })

  it("macOS + dedicated GPU contradiction resolves to OS-kept with a surfaced note", () => {
    const res = scoreLaptops([tinyMacAir], answers({ os: "macos", gpu: "dedicated" }))
    expect(res.map(r => r.id)).toEqual(["tiny-mac-air"])
    expect(res[0].relaxationLedger!.map(e => e.requirement)).toContain("gpu")
    expect(res[0].os).toBe("macOS")
  })
})

describe("scoring model", () => {
  it("stamps versions on every result and covers all nine dimensions", () => {
    const res = scoreLaptops([tinyWindowsPro, tinyMacAir], answers({ useCase: "coding" }))
    for (const r of res) {
      expect(r.scoringVersion).toBe(SCORING_VERSION)
      expect(r.weightsVersion).toBe(WEIGHTS_VERSION)
      expect(Object.keys(r.scoringMeta!.caps).sort()).toEqual([...DIMS_9].sort())
      expect(Object.keys(r.scoringMeta!.weights).sort()).toEqual([...DIMS_9].sort())
      expect(r.matchScore).toBeGreaterThanOrEqual(0)
      expect(r.matchScore).toBeLessThanOrEqual(100)
    }
  })

  it("is deterministic across runs and input orders", () => {
    const a = answers({ useCase: "gaming", budgetMax: 2500, minRam: 16 })
    const pool = [tinyWindowsPro, tinyMacAir, tinyIntegrated15, tinyBudgetLow]
    const first = JSON.stringify(scoreLaptops(pool, a))
    expect(JSON.stringify(scoreLaptops(pool, a))).toBe(first)
    expect(JSON.stringify(scoreLaptops([...pool].reverse(), a))).toBe(first)
  })

  it("penalizes refurbished and rewards upgradeability/expandability", () => {
    const base = mkLaptop({})
    const ref = scoreLaptops([base, mkLaptop({ id: "ref", isRefurbished: true })], answers({}))
    expect(ref.find(r => r.id === base.id)!.matchScore).toBeGreaterThan(ref.find(r => r.id === "ref")!.matchScore)
    const up = scoreLaptops(
      [mkLaptop({ id: "plain" }), mkLaptop({ id: "up", ramUpgradeable: true, storageExpandable: true })],
      answers({})
    )
    expect(up.find(r => r.id === "up")!.matchScore).toBeGreaterThan(up.find(r => r.id === "plain")!.matchScore)
  })
})

describe("tie-breaking", () => {
  it("identical candidates order by id ascending (byte-identical)", () => {
    const a = mkLaptop({ id: "b-laptop" })
    const b = mkLaptop({ id: "a-laptop" })
    const res = scoreLaptops([a, b], answers({}))
    expect(res.map(r => r.id)).toEqual(["a-laptop", "b-laptop"])
    expect(JSON.stringify(scoreLaptops([b, a], answers({})))).toBe(JSON.stringify(res))
  })
})

describe("slider overlay uses the authoritative engine", () => {
  const slider = (over: Partial<Record<DimName, number>>): Record<DimName, number> => ({
    cpu: 0.1, gpu: 0.1, display: 0.1, ram: 0.1, storage: 0.1, battery: 0.1, portability: 0.1, build: 0.1, ...over,
  })

  it("returns the same set, labeled, deterministically", () => {
    const a = answers({ useCase: "travel" })
    const base = scoreLaptops([tinyWindowsPro, tinyMacAir, tinyIntegrated15], a)
    const once = rescoreWithOverlay(base, a, weightsForUseCase("travel"))
    const twice = rescoreWithOverlay(base, a, weightsForUseCase("travel"))
    expect(once.map(r => r.id).sort()).toEqual(base.map(r => r.id).sort())
    expect(once.every(r => r.adjustedView)).toBe(true)
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
    expect(rescoreWithOverlay([], a, slider({}))).toEqual([])
  })

  it("an extreme battery overlay promotes the long-battery laptop via the same scorer", () => {
    const a = answers({ useCase: "coding" })
    const base = scoreLaptops([tinyWindowsPro, tinyMacAir], a)
    const over = rescoreWithOverlay(base, a, slider({ battery: 10, cpu: 0, gpu: 0, display: 0, ram: 0, storage: 0, portability: 0, build: 0 }))
    expect(over[0].id).toBe("tiny-mac-air") // 16h vs 9h on the battery cap
    for (const r of over) {
      expect(r.matchScore).toBeGreaterThanOrEqual(0)
      expect(r.matchScore).toBeLessThanOrEqual(100)
    }
  })
})

describe("candidate edge cases", () => {
  it("zero candidates → empty; one candidate → single ranked item", () => {
    expect(scoreLaptops([], answers({}))).toEqual([])
    const one = scoreLaptops([tinyWindowsPro], answers({ useCase: "coding" }))
    expect(one).toHaveLength(1)
    expect(one[0].explanation!.why.length).toBeLessThanOrEqual(2)
  })

  it("sparse rows never crash and keep null caps", () => {
    const sparse = mkLaptop({ cpuCores: null, batteryLife: null, weight: null, displayBrightness: null, displayColorGamut: null, buildMaterial: null, reviewScore: null })
    const res = scoreLaptops([sparse], answers({}))
    expect(res).toHaveLength(1)
    const caps = res[0].scoringMeta!.caps
    expect(caps.cpu).toBeNull()
    expect(caps.battery).toBeNull()
    expect(caps.portability).toBeNull()
  })

  it("a pool where every laptop misses a capability still ranks", () => {
    const pool = [mkLaptop({ id: "n1", batteryLife: null }), mkLaptop({ id: "n2", batteryLife: null, price: 2000 })]
    const res = scoreLaptops(pool, answers({}))
    expect(res).toHaveLength(2)
  })

  it("a pool failing a soft preference everywhere still returns (soft never eliminates)", () => {
    const pool = [mkLaptop({ id: "h1", weight: 3.2 }), mkLaptop({ id: "h2", weight: 3.0 })]
    const res = scoreLaptops(pool, answers({ portability: "light" }))
    expect(res.map(r => r.id).sort()).toEqual(["h1", "h2"])
    expect(res.every(r => !r.exhausted)).toBe(true)
  })
})

describe("explanations derive from scoring data", () => {
  it("why/strengths/compromises reference only approved dims with real evidence", () => {
    const res = scoreLaptops([tinyWindowsPro, tinyMacAir, tinyIntegrated15], answers({ useCase: "coding", minRam: 8 }))
    for (const r of res) {
      const e = r.explanation!
      expect(e.why.length).toBeLessThanOrEqual(2)
      for (const d of [...e.why, ...e.compromises]) expect(DIMS_9).toContain(d)
      for (const s of e.strengths) {
        expect(DIMS_9).toContain(s.dim)
        expect(s.evidence.length).toBeGreaterThan(0)
      }
      expect(e.satisfied).toContain("ram")
    }
    // whyAbove chains each item to the next-ranked item.
    for (let i = 0; i < res.length - 1; i++) {
      expect(res[i].explanation!.whyAbove?.vsId).toBe(res[i + 1].id)
    }
    expect(res[res.length - 1].explanation!.whyAbove).toBeNull()
  })

  it("toCanonical is the single funnel: legacy answers flow through it", () => {
    const c = toCanonical(answers({ useCase: "coding", minRam: 32, budgetMax: 2000 }))
    expect(c.useCase).toBe("coding")
    expect(c.legacyMinRamExact).toBe(32)
    const r = engineRun([tinyWindowsPro], c)
    expect(r.items).toHaveLength(1)
    expect(r.scoringVersion).toBe(SCORING_VERSION)
  })
})
