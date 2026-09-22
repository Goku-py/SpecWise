import { describe, expect, it } from "vitest"
import {
  CanonicalAnswersSchema,
  RAM_FLOOR,
  STORAGE_FLOOR,
  WORKLOADS,
  toCanonical,
  workloadToUseCase,
  type CanonicalAnswers,
} from "@/lib/recommendation/questionnaire"
import { buildProfile } from "@/lib/recommendation/profile"
import {
  batteryBand,
  brightnessBand,
  buildBand,
  capabilitiesFor,
  cpuBand,
  displayCapability,
  gamutBand,
  gpuBand,
  panelBand,
  portabilityBand,
  ramBand,
  refreshBand,
  storageBand,
} from "@/lib/recommendation/capabilities"
import { QuizAnswersSchema } from "@/lib/validation"
import { defaultQuizAnswers, type QuizAnswers, type ScorableLaptop } from "@/lib/types"

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return { ...defaultQuizAnswers, ...overrides }
}

function sparseLaptop(): ScorableLaptop {
  return {
    id: "sparse-1",
    brand: "Sparse",
    model: "Null",
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
    displaySize: 14,
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
}

describe("Q1–Q9 canonical contract", () => {
  it("exposes exactly the nine approved dimensions plus legacy-compat fields", () => {
    const c = toCanonical(answers({ useCase: "coding" }))
    for (const k of ["workload", "useCase", "region", "maxBudget", "os", "carry", "powerTrade", "multitask", "storageNeed", "screen", "toughBuild", "dealMinRam16"] as const) {
      expect(c, `missing ${k}`).toHaveProperty(k)
    }
    // Dead inputs are dropped — they must not exist on the canonical shape.
    for (const dead of ["displaySize", "webcam", "security", "refurbished", "budgetMin"]) {
      expect(c, `dead field leaked: ${dead}`).not.toHaveProperty(dead)
    }
  })

  it("maps every workload to its weight-profile useCase", () => {
    expect(workloadToUseCase("study")).toBe("student")
    expect(workloadToUseCase("office")).toBe("office")
    expect(workloadToUseCase("code")).toBe("coding")
    expect(workloadToUseCase("gaming")).toBe("gaming")
    expect(workloadToUseCase("creative")).toBe("graphic-design")
    expect(workloadToUseCase("travel")).toBe("travel")
    expect(WORKLOADS).toHaveLength(6)
  })

  it("maps legacy useCase → workload, unknown/null → general profile", () => {
    expect(toCanonical(answers({ useCase: "student" }))).toMatchObject({ workload: "study", useCase: "student" })
    expect(toCanonical(answers({ useCase: "graphic-design" }))).toMatchObject({ workload: "creative" })
    expect(toCanonical(answers({ useCase: "video-editing" }))).toMatchObject({ workload: "creative" })
    expect(toCanonical(answers({ useCase: null }))).toMatchObject({ workload: null, useCase: "general" })
    expect(toCanonical(answers({ useCase: "mixed" }))).toMatchObject({ workload: null, useCase: "mixed" })
  })

  it("Quick (Q1–Q5) and Advanced (+Q6–Q9) produce the same canonical shape", () => {
    const quick = toCanonical(answers({ useCase: "gaming", budgetMax: 1500, os: "windows", portability: "light", battery: "high" }))
    const advanced = toCanonical(answers({
      useCase: "gaming", budgetMax: 1500, os: "windows", portability: "light", battery: "high",
      minRam: 32, minStorage: 1024, displayQuality: ["high-refresh", "oled"], buildQuality: "very-important",
    }))
    expect(Object.keys(advanced).sort()).toEqual(Object.keys(quick).sort())
    expect(quick).toMatchObject({ workload: "gaming", maxBudget: 1500, os: "windows", carry: "always", powerTrade: "battery" })
    expect(advanced).toMatchObject({ multitask: "extreme", storageNeed: "media", screen: ["smooth", "vivid"], toughBuild: true })
    expect(quick.multitask).toBeNull()
    expect(quick.screen).toEqual([])
  })

  it("skipped questions stay null and never become requirements", () => {
    const c = toCanonical(answers({ useCase: "travel" }))
    expect([c.maxBudget, c.os, c.carry, c.powerTrade, c.multitask, c.storageNeed, c.toughBuild]).toEqual(
      [null, null, null, null, null, null, null]
    )
    const p = buildProfile(c, null)
    expect(p.hard).toMatchObject({ budgetMin: null, budgetMax: null, os: null, minRam: null, minStorage: null, cpuBrand: null, ports: [] })
    expect(p.hard.gpuDedicated).toBe(false)
  })

  it("Q2 budget maps to maxBudget; Q3 keeps windows/macos, passes chromeos/linux through as legacy", () => {
    expect(toCanonical(answers({ budgetMax: 1200 })).maxBudget).toBe(1200)
    expect(toCanonical(answers({ os: "macos" }))).toMatchObject({ os: "macos", legacyOsRaw: null })
    expect(toCanonical(answers({ os: "chromeos" }))).toMatchObject({ os: null, legacyOsRaw: "chromeos" })
    expect(toCanonical(answers({ os: "linux" }))).toMatchObject({ os: null, legacyOsRaw: "linux" })
  })

  it("Q4/Q5 plain language maps to carry/powerTrade", () => {
    expect(toCanonical(answers({ portability: "light" })).carry).toBe("always")
    expect(toCanonical(answers({ portability: "balanced" })).carry).toBe("sometimes")
    expect(toCanonical(answers({ portability: "desktop-replacement" })).carry).toBe("desk")
    expect(toCanonical(answers({ battery: "top" })).powerTrade).toBe("battery")
    expect(toCanonical(answers({ battery: "low" })).powerTrade).toBe("performance")
    expect(toCanonical(answers({ battery: "medium" })).powerTrade).toBe("balanced")
  })

  it("Q8 display qualities map to screen picks, capped at two", () => {
    expect(toCanonical(answers({ displayQuality: ["high-refresh", "oled", "touch", "bright"] })).screen).toEqual(["smooth", "vivid"])
    expect(toCanonical(answers({ displayQuality: ["touch"] })).screen).toEqual(["touch"])
    expect(toCanonical(answers({ displayQuality: ["basic"] })).screen).toEqual([])
  })

  it("RAM/storage floor bands hold, and exact legacy floors are preserved (never rounded down)", () => {
    expect(RAM_FLOOR).toEqual({ light: 8, heavy: 16, extreme: 32 })
    expect(STORAGE_FLOOR).toEqual({ docs: 256, lots: 512, media: 1024 })
    expect(toCanonical(answers({ minRam: 40 }))).toMatchObject({ multitask: "extreme", legacyMinRamExact: 40 })
    expect(toCanonical(answers({ minRam: 20 }))).toMatchObject({ multitask: "heavy", legacyMinRamExact: 20 })
    expect(toCanonical(answers({ minStorage: 768 }))).toMatchObject({ storageNeed: "lots", legacyMinStorageExact: 768 })
    const p = buildProfile(toCanonical(answers({ minRam: 40 })), null)
    expect(p.hard.minRam).toBe(40)
    const p2 = buildProfile(toCanonical(answers({ minRam: 20 })), null)
    expect(p2.hard.minRam).toBe(20)
  })

  it("legacy compat inputs pass through; deal-breaker defaults off", () => {
    const c = toCanonical(answers({ cpuBrand: "amd", gpu: "dedicated", ports: ["hdmi"], gaming: "aaa", upgradeability: "must-have" }))
    expect(c).toMatchObject({ legacyCpuBrand: "amd", legacyGpuDedicated: true, legacyPorts: ["hdmi"], legacyGaming: "aaa", legacyUpgradeMust: true, dealMinRam16: false })
    expect(toCanonical(answers({ cpuBrand: "no-preference" })).legacyCpuBrand).toBeNull()
  })
})

describe("CanonicalAnswersSchema boundaries", () => {
  it("accepts a full advanced payload", () => {
    const r = CanonicalAnswersSchema.safeParse({
      workload: "code", useCase: "coding", region: "IN", maxBudget: 80000, os: "windows",
      carry: "sometimes", powerTrade: "balanced", multitask: "heavy", storageNeed: "lots",
      screen: ["sharp", "smooth"], toughBuild: false, dealMinRam16: true,
    })
    expect(r.success).toBe(true)
  })

  it("rejects invalid answers", () => {
    expect(CanonicalAnswersSchema.safeParse({ workload: "gamer" }).success).toBe(false)
    expect(CanonicalAnswersSchema.safeParse({ screen: ["sharp", "smooth", "vivid"] }).success).toBe(false)
    expect(CanonicalAnswersSchema.safeParse({ maxBudget: -5 }).success).toBe(false)
    expect(CanonicalAnswersSchema.safeParse({ os: "chromeos" }).success).toBe(false)
  })

  it("legacy QuizAnswersSchema still requires useCase and guards budget order", () => {
    expect(QuizAnswersSchema.safeParse({ ...defaultQuizAnswers, useCase: null }).success).toBe(false)
    expect(QuizAnswersSchema.safeParse({ ...defaultQuizAnswers, useCase: "coding" }).success).toBe(true)
    const bad = QuizAnswersSchema.safeParse({ ...defaultQuizAnswers, useCase: "coding", budgetMin: 2000, budgetMax: 1000 })
    expect(bad.success).toBe(false)
  })
})

describe("profile kinds stay distinct", () => {
  function canon(overrides: Partial<CanonicalAnswers>): CanonicalAnswers {
    return { ...toCanonical(answers({ useCase: "coding" })), ...overrides }
  }

  it("weights always renormalize to 1", () => {
    for (const c of [
      canon({}),
      canon({ powerTrade: "performance", carry: "always", screen: ["smooth", "vivid"], toughBuild: true }),
      canon({ powerTrade: "battery", carry: "desk" }),
    ]) {
      const sum = Object.values(buildProfile(c, null).weights).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 10)
    }
  })

  it("PRIORITY shifts weight without creating hardness", () => {
    const base = buildProfile(canon({}), null)
    const perf = buildProfile(canon({ powerTrade: "performance" }), null)
    expect(perf.weights.cpu).toBeGreaterThan(base.weights.cpu)
    expect(perf.weights.battery).toBeLessThan(base.weights.battery)
    expect(perf.hard.minRam).toBe(base.hard.minRam)
    expect(perf.tradeOffs.map(t => t.id)).toContain("battery-for-power")
  })

  it("DEAL_BREAKER pins the RAM floor", () => {
    const p = buildProfile(canon({ multitask: "light", dealMinRam16: true }), null)
    expect(p.hard.minRam).toBe(16)
    expect(p.dealMinRam16).toBe(true)
  })

  it("contradictory macOS + dedicated GPU is surfaced, never silent", () => {
    const p = buildProfile(canon({ os: "macos", legacyGpuDedicated: true }), null)
    expect(p.contradictions).toHaveLength(1)
    expect(p.contradictions[0]).toMatch(/macOS/i)
    // Both facts are still present on the profile for the engine to resolve.
    expect(p.hard.os).toBe("macos")
    expect(p.hard.gpuDedicated).toBe(true)
  })

  it("missing preferences yield a valid neutral profile", () => {
    const p = buildProfile(toCanonical(answers({ useCase: null })), null)
    expect(p.useCase).toBe("general")
    expect(p.tradeOffs).toEqual([])
    expect(p.contradictions).toEqual([])
  })
})

describe("capability normalization", () => {
  it("band edges are exact", () => {
    expect(cpuBand(null)).toBeNull()
    expect(cpuBand(16)).toBe(1.0)
    expect(cpuBand(8)).toBe(0.75)
    expect(cpuBand(4)).toBe(0.45)
    expect(ramBand(32)).toBe(1.0)
    expect(ramBand(16)).toBe(0.8)
    expect(ramBand(8)).toBe(0.5)
    expect(storageBand(1024)).toBe(1.0)
    expect(batteryBand(null)).toBeNull()
    expect(batteryBand(10)).toBe(0.9)
    expect(portabilityBand(null, "always")).toBeNull()
    expect(refreshBand(144)).toBe(1.0)
    expect(brightnessBand(null)).toBeNull()
    expect(gamutBand(null)).toBeNull()
  })

  it("gpu/build carry confidence and source", () => {
    expect(gpuBand("dedicated", 12)).toMatchObject({ value: 1.0, source: "measured" })
    expect(gpuBand("dedicated", null).source).toBe("inferred")
    expect(gpuBand("integrated", null).value).toBe(0.3)
    expect(buildBand(null)).toMatchObject({ confidence: 0.3, source: "missing" })
    expect(buildBand("Aluminum")).toMatchObject({ value: 1.0, source: "claimed" })
    expect(panelBand(null).confidence).toBe(0.3)
  })

  it("display degrades gracefully to measurable subs (refresh is always present)", () => {
    const d = displayCapability(
      { displayRefreshRate: 60, displayPanelType: null, displayBrightness: null, displayColorGamut: null },
      { screen: [], touchAvailable: true, isTouchscreen: false }
    )
    // refresh (0.4) + panel-unknown (0.5) average — computed from real data only.
    expect(d.value).toBeCloseTo(0.45, 10)
    expect(d.source).toBe("inferred")
    const vivid = displayCapability(
      { displayRefreshRate: 144, displayPanelType: "OLED", displayBrightness: 500, displayColorGamut: "DCI-P3 100%" },
      { screen: ["vivid", "smooth"], touchAvailable: true, isTouchscreen: false }
    )
    expect(vivid.value).toBeGreaterThan(0.9)
  })

  it("sparse catalog rows keep nulls — no null→zero coercion", () => {
    const caps = capabilitiesFor(sparseLaptop(), { carry: null, screen: [] })
    expect(caps.cpu.value).toBeNull()
    expect(caps.battery.value).toBeNull()
    expect(caps.portability.value).toBeNull()
    expect(caps.ram.value).toBe(0.5)
    expect(caps.storage.value).toBe(0.5)
    for (const v of Object.values(caps)) {
      if (v.value !== null) {
        expect(v.value).toBeGreaterThanOrEqual(0)
        expect(v.value).toBeLessThanOrEqual(1)
      }
      expect(v.confidence).toBeGreaterThanOrEqual(0)
      expect(v.confidence).toBeLessThanOrEqual(1)
    }
  })
})
