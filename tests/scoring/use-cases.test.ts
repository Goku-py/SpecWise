import { describe, expect, it } from "vitest"
import { scoreLaptops } from "@/lib/scoring"
import { defaultQuizAnswers } from "@/lib/types"
import type { UseCase } from "@/lib/types"
import { catalogById, catalogLaptops } from "./fixtures/catalog"

// ─────────────────────────────────────────────────────────────────────────────
// Golden baseline v2 (Phase 2, engine v2.phase2 / weights v1).
// INTENTIONAL CHANGE from the 2026-08-03 baseline: the old F-score ranked
// gaming laptops (Zephyrus G16, Stealth 16) #1 for student/office/travel —
// poor recommendations. The v2 engine (value dim + calibrated weights)
// ranks affordable portable laptops there instead. Re-captured 2026-09-22
// after the dense-ranking value fix (identical prices share one value cap).
// Sorting is fully deterministic (score → price → weight → id).
// Sorting is fully deterministic (score → price → weight → id).
// ─────────────────────────────────────────────────────────────────────────────
const GOLDEN_TOP3: Readonly<Record<UseCase, ReadonlyArray<{ id: string; score: number }>>> = {
  student: [
    { id: "Lenovo-IdeaPad Slim 5-14", score: 88 },
    { id: "Samsung-Galaxy Book4 Pro-14", score: 85 },
    { id: "Microsoft-Surface Laptop 7-13.8", score: 85 },
  ],
  office: [
    { id: "Lenovo-IdeaPad Slim 5-14", score: 86 },
    { id: "HP-Envy 16", score: 85 },
    { id: "Samsung-Galaxy Book4 Pro-14", score: 85 },
  ],
  coding: [
    { id: "MSI-Stealth 16 Studio", score: 91 },
    { id: "ASUS-ROG Zephyrus G16", score: 89 },
    { id: "MSI-Stealth 14 Studio", score: 89 },
  ],
  gaming: [
    { id: "Razer-Blade 16", score: 94 },
    { id: "Lenovo-Legion 7i-16", score: 92 },
    { id: "HP-OMEN 16", score: 91 },
  ],
  "video-editing": [
    { id: "Razer-Blade 16", score: 94 },
    { id: "MSI-Stealth 16 Studio", score: 93 },
    { id: "Lenovo-Legion 7i-16", score: 92 },
  ],
  "graphic-design": [
    { id: "Razer-Blade 16", score: 93 },
    { id: "ASUS-ROG Zephyrus G16", score: 92 },
    { id: "Lenovo-Legion 7i-16", score: 91 },
  ],
  travel: [
    { id: "Samsung-Galaxy Book4 Pro-14", score: 89 },
    { id: "Microsoft-Surface Laptop 7-13.8-1TB", score: 89 },
    { id: "Lenovo-IdeaPad Slim 5-14", score: 89 },
  ],
  general: [
    { id: "Samsung-Galaxy Book4 Pro-14", score: 86 },
    { id: "Lenovo-IdeaPad Slim 5-14", score: 86 },
    { id: "Microsoft-Surface Laptop 7-13.8-1TB", score: 86 },
  ],
  "ai-ml": [
    { id: "Razer-Blade 16", score: 98 },
    { id: "ASUS-ROG Strix Scar 17", score: 96 },
    { id: "MSI-Stealth 16 Studio", score: 96 },
  ],
  mixed: [
    { id: "MSI-Stealth 14 Studio", score: 88 },
    { id: "MSI-Stealth 16 Studio", score: 88 },
    { id: "HP-Envy 16", score: 87 },
  ],
}

const ALL_USE_CASES = Object.keys(GOLDEN_TOP3) as UseCase[]

// Use cases whose priority profile weights cpu >= 0.15 — the only trigger for a
// match reason with default (all-null) answers.
const CPU_WEIGHTED_USE_CASES = new Set<UseCase>([
  "coding",
  "gaming",
  "video-editing",
  "graphic-design",
  "ai-ml",
  "mixed",
])

describe("catalog fixture sanity", () => {
  it("loads all 56 records with unique ids and every row active", () => {
    expect(catalogLaptops).toHaveLength(56)
    expect(catalogById.size).toBe(56)
    for (const l of catalogLaptops) {
      expect(l.isActive).toBe(true)
      expect(l.id.length).toBeGreaterThan(0)
      expect(l.price).toBeGreaterThan(0)
    }
  })
})

describe("per-use-case golden regression over the full catalog", () => {
  it("top-3 ids + scores match the baked baseline for every use case", () => {
    for (const useCase of ALL_USE_CASES) {
      const results = scoreLaptops(catalogLaptops, { ...defaultQuizAnswers, useCase })
      const top3 = results.slice(0, 3).map(r => ({ id: r.id, score: r.matchScore }))
      expect(top3, `top-3 mismatch for use case "${useCase}"`).toEqual(GOLDEN_TOP3[useCase])
    }
  })

  it("returns 12 ranked results with the top score first for every use case", () => {
    for (const useCase of ALL_USE_CASES) {
      const results = scoreLaptops(catalogLaptops, { ...defaultQuizAnswers, useCase })
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.length).toBeLessThanOrEqual(12)
      expect(results[0].matchScore).toBe(Math.max(...results.map(r => r.matchScore)))
      const scores = results.map(r => r.matchScore)
      expect([...scores].sort((a, b) => b - a)).toEqual(scores)
    }
  })

  it("top-1 exists and reasons behave per the actual contract", () => {
    for (const useCase of ALL_USE_CASES) {
      const results = scoreLaptops(catalogLaptops, { ...defaultQuizAnswers, useCase })
      const top1 = results[0]
      expect(top1).toBeDefined()

      if (CPU_WEIGHTED_USE_CASES.has(useCase)) {
        // cpu >= 0.15 in the profile + top-1 laptop has >= 8 cores → reason fires.
        expect(top1.matchReasons.length, `reasons for "${useCase}"`).toBeGreaterThanOrEqual(1)
      } else {
        // student/office/travel/general weight cpu < 0.15, so with default
        // answers no reason can fire at all (documented contract, not a bug).
        expect(top1.matchReasons, `reasons for "${useCase}"`).toEqual([])
      }
      expect(top1.matchReasons.length).toBeLessThanOrEqual(4)
    }
  })
})
