import { describe, expect, it } from "vitest"
import { scoreLaptops } from "@/lib/scoring"
import { defaultQuizAnswers } from "@/lib/types"
import type { QuizAnswers } from "@/lib/types"
import {
  tinyBudgetHuge,
  tinyBudgetLow,
  tinyCatalog,
  tinyGamingRig,
  tinyIntegrated15,
  tinyMacAir,
  tinyPopularLoose,
  tinyWindowsPro,
} from "./fixtures/tiny"
import { catalogLaptops } from "./fixtures/catalog"

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return { ...defaultQuizAnswers, ...overrides }
}

/** Ids of the scored recommendations, in ranked order. */
function rankedIds(input: Parameters<typeof scoreLaptops>[0], a: QuizAnswers): string[] {
  return scoreLaptops(input, a).map(r => r.id)
}

describe("FILTER_STEPS — each step removes non-matching laptops when survivable", () => {
  it("budget step keeps only in-range prices (min+max, min-only, max-only)", () => {
    const subset = [tinyWindowsPro, tinyBudgetLow, tinyBudgetHuge] // 1499 / 250 / 8500

    expect(rankedIds(subset, answers({ budgetMin: 1000, budgetMax: 2000 }))).toEqual([
      "tiny-windows-pro",
    ])
    expect(rankedIds(subset, answers({ budgetMin: 2000 }))).toEqual([
      "tiny-budget-huge",
    ])
    expect(rankedIds(subset, answers({ budgetMax: 1000 }))).toEqual([
      "tiny-budget-low",
    ])
  })

  it("os step keeps only laptops whose OS matches the preference", () => {
    const subset = [tinyWindowsPro, tinyMacAir]

    expect(rankedIds(subset, answers({ os: "windows" }))).toEqual(["tiny-windows-pro"])
    expect(rankedIds(subset, answers({ os: "macos" }))).toEqual(["tiny-mac-air"])
  })

  it("cpuBrand step keeps only laptops of the requested brand (case-insensitive)", () => {
    const subset = [tinyWindowsPro, tinyMacAir, tinyGamingRig]

    expect(rankedIds(subset, answers({ cpuBrand: "intel" }))).toEqual(["tiny-windows-pro"])
    expect(rankedIds(subset, answers({ cpuBrand: "amd" }))).toEqual(["tiny-gaming-rig"])
    expect(rankedIds(subset, answers({ cpuBrand: "apple" }))).toEqual(["tiny-mac-air"])
  })

  it("minRam step keeps only laptops meeting the minimum", () => {
    const subset = [tinyWindowsPro, tinyMacAir, tinyBudgetLow] // 32 / 16 / 8

    expect(rankedIds(subset, answers({ minRam: 32 }))).toEqual(["tiny-windows-pro"])
    expect(rankedIds(subset, answers({ minRam: 16 }))).toEqual(["tiny-windows-pro", "tiny-mac-air"])
  })

  it("minStorage step keeps only laptops meeting the minimum", () => {
    const subset = [tinyWindowsPro, tinyMacAir, tinyBudgetLow] // 1024 / 512 / 256

    expect(rankedIds(subset, answers({ minStorage: 1024 }))).toEqual(["tiny-windows-pro"])
    expect(rankedIds(subset, answers({ minStorage: 512 }))).toEqual(["tiny-windows-pro", "tiny-mac-air"])
  })

  it("gpu step keeps only dedicated-GPU laptops when dedicated is requested", () => {
    const subset = [tinyWindowsPro, tinyMacAir, tinyIntegrated15]

    expect(rankedIds(subset, answers({ gpu: "dedicated" }))).toEqual(["tiny-windows-pro"])
    // "maybe" and "integrated" are soft — no elimination.
    expect(rankedIds(subset, answers({ gpu: "maybe" }))).toHaveLength(3)
    expect(rankedIds(subset, answers({ gpu: "integrated" }))).toHaveLength(3)
  })

  it("ports step keeps only laptops missing at most one required port", () => {
    const subset = [tinyWindowsPro, tinyGamingRig, tinyBudgetHuge]
    // thunderbolt+ethernet: windows-pro (missing ethernet only) and gaming-rig
    // (missing thunderbolt only) pass with score 0.5; budget-huge misses both → 0.
    expect(rankedIds(subset, answers({ ports: ["thunderbolt", "ethernet"] }))).toEqual([
      "tiny-windows-pro",
      "tiny-gaming-rig",
    ])
  })

  it("combined steps intersect when the intersection survives", () => {
    const subset = [tinyWindowsPro, tinyMacAir, tinyIntegrated15, tinyGamingRig]
    const a = answers({ os: "windows", gpu: "dedicated", minRam: 32 })

    expect(rankedIds(subset, a)).toEqual(["tiny-windows-pro", "tiny-gaming-rig"])
  })
})

describe("FILTER_STEPS — fallbacks keep results when a strict step would empty the pool", () => {
  it("budget fallback relaxes to [0.7×min, 1.3×max] instead of eliminating", () => {
    const subset = [tinyBudgetLow, tinyWindowsPro, tinyGamingRig] // 250 / 1499 / 2199
    // Strict band [2000, 2000] matches nothing; fallback band [1400, 2600] keeps both mid-range.
    const a = answers({ budgetMin: 2000, budgetMax: 2000 })

    expect(rankedIds(subset, a).sort()).toEqual(["tiny-gaming-rig", "tiny-windows-pro"])
    expect(rankedIds(subset, a)).not.toContain("tiny-budget-low")
  })

  it("minRam fallback relaxes to max(8, min-4) instead of eliminating", () => {
    const subset = [tinyMacAir, tinyBudgetLow] // 16 / 8
    // Strict: ram >= 20 → nothing; fallback: ram >= max(8, 16) → mac-air survives.
    const a = answers({ minRam: 20 })

    expect(rankedIds(subset, a)).toEqual(["tiny-mac-air"])
  })

  it("steps whose filter AND fallback empty are skipped — the pool is unchanged", () => {
    // Budget [5000, 5500]: strict band empty, fallback band [3500, 7150] also
    // empty (nothing between 2600 and 8500) → budget step skipped entirely.
    const subset = [tinyBudgetLow, tinyPopularLoose, tinyBudgetHuge]
    const a = answers({ budgetMin: 5000, budgetMax: 5500 })

    expect(rankedIds(subset, a).sort()).toEqual([
      "tiny-budget-huge",
      "tiny-budget-low",
      "tiny-popular-loose",
    ])
  })

  it("soft steps (os, cpuBrand, minStorage, gpu, ports) never eliminate the whole pool", () => {
    const subset = [tinyWindowsPro, tinyMacAir]
    // "qualcomm" is deliberately outside the CpuBrand union — stale form values
    // must still be handled gracefully by the engine (no laptop matches it).
    const a = answers({
      os: "chromeos", // no laptop matches macOS/Windows preference
      cpuBrand: "qualcomm" as QuizAnswers["cpuBrand"],
      minStorage: 8192,
      gpu: "maybe", // soft requirement — no strict filter
      ports: ["thunderbolt", "ethernet", "sd-card"],
    })

    // Every step falls back to no-op → the entire active pool survives.
    expect(rankedIds(subset, a).sort()).toEqual(["tiny-mac-air", "tiny-windows-pro"])
  })
})

describe("relaxation pass (second pass) — actual contract", () => {
  it("never runs when at least one active laptop exists: impossible filters still yield results", () => {
    // Most aggressive answer set possible. Pass 1's per-step fallbacks guarantee
    // a non-empty pool, so the second relaxation pass is unreachable.
    const a = answers({
      budgetMin: 1,
      budgetMax: 1,
      os: "chromeos",
      cpuBrand: "qualcomm" as QuizAnswers["cpuBrand"],
      minRam: 1024,
      minStorage: 8192,
      gpu: "dedicated",
      ports: ["thunderbolt", "ethernet", "sd-card"],
    })

    const result = scoreLaptops(tinyCatalog, a)
    expect(result.length).toBeGreaterThan(0)
    // Only the dedicated-GPU step survived (its strict filter matched 5 laptops).
    expect(result).toHaveLength(5)
    for (const r of result) expect(r.gpuType).toBe("dedicated")
  })

  it("returns [] when every laptop is inactive (relaxation + last resort both yield nothing)", () => {
    const inactive = tinyCatalog.map(l => ({ ...l, isActive: false }))
    expect(scoreLaptops(inactive, defaultQuizAnswers)).toEqual([])
  })

  it("returns [] for an empty catalog", () => {
    expect(scoreLaptops([], defaultQuizAnswers)).toEqual([])
  })

  it("excludes inactive laptops from scoring even when they would match best", () => {
    const inactiveClone = { ...tinyWindowsPro, id: "tiny-windows-pro-inactive", isActive: false }
    const a = answers({ os: "windows", gpu: "dedicated", minRam: 32 })

    const result = scoreLaptops([inactiveClone, tinyMacAir], a)
    expect(result.map(r => r.id)).toEqual(["tiny-mac-air"])
  })
})

describe("last-resort branch — actual contract", () => {
  it("is unreachable with a non-empty active catalog: step-skip, not popularity, decides", () => {
    // tiny-popular-loose (2600, isPopular) sits only inside the loose band
    // [2500, 8250] for budget [5000, 5500]. If the last-resort branch fired, the
    // loose-band filter would run — but it does not: the budget step is skipped
    // and every laptop survives scoring.
    const result = scoreLaptops([tinyPopularLoose], answers({ budgetMin: 5000, budgetMax: 5500 }))
    expect(result.map(r => r.id)).toEqual(["tiny-popular-loose"])

    // Same budget with only the $250 laptop: last resort would drop it (loose
    // band starts at 2500) and return [] — the engine instead returns it.
    const lowResult = scoreLaptops([tinyBudgetLow], answers({ budgetMin: 5000, budgetMax: 5500 }))
    expect(lowResult.map(r => r.id)).toEqual(["tiny-budget-low"])
  })

  it("budget constraints never eliminate the full catalog", () => {
    // Whole catalog max price is 3499 < fallback floor 3500 for [5000, 5500]
    // → budget step skipped → all 56 candidates, top 12 returned.
    const result = scoreLaptops(catalogLaptops, answers({ budgetMin: 5000, budgetMax: 5500 }))
    expect(result).toHaveLength(12)
  })
})
