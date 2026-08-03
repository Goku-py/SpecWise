import { describe, expect, it } from "vitest"
import { scoreLaptops } from "@/lib/scoring"
import { defaultQuizAnswers } from "@/lib/types"
import type { UseCase } from "@/lib/types"
import { catalogById, catalogLaptops } from "./fixtures/catalog"

// ─────────────────────────────────────────────────────────────────────────────
// Golden baseline: top-3 (id, matchScore) per use case over the full 56-laptop
// catalog with defaultQuizAnswers + useCase. Captured from a throwaway tsx run
// on 2026-08-03 (scripts/golden-top3.ts, deleted). Sorting is stable, so ties
// resolve by catalog order and these values are deterministic.
// ─────────────────────────────────────────────────────────────────────────────
const GOLDEN_TOP3: Readonly<Record<UseCase, ReadonlyArray<{ id: string; score: number }>>> = {
  student: [
    { id: "ASUS-ROG Zephyrus G16", score: 94 },
    { id: "MSI-Stealth 16 Studio", score: 94 },
    { id: "MSI-Stealth 14 Studio", score: 93 },
  ],
  office: [
    { id: "ASUS-ROG Zephyrus G16", score: 94 },
    { id: "MSI-Stealth 16 Studio", score: 94 },
    { id: "MSI-Stealth 14 Studio", score: 93 },
  ],
  coding: [
    { id: "ASUS-ROG Zephyrus G16", score: 96 },
    { id: "MSI-Stealth 16 Studio", score: 96 },
    { id: "Samsung-Galaxy Book4 Ultra", score: 95 },
  ],
  gaming: [
    { id: "ASUS-ROG Strix Scar 17", score: 98 },
    { id: "Razer-Blade 16", score: 97 },
    { id: "ASUS-ROG Zephyrus G16", score: 95 },
  ],
  "video-editing": [
    { id: "ASUS-ROG Strix Scar 17", score: 97 },
    { id: "Razer-Blade 16", score: 97 },
    { id: "ASUS-ROG Zephyrus G16", score: 96 },
  ],
  "graphic-design": [
    { id: "ASUS-ROG Zephyrus G16", score: 96 },
    { id: "ASUS-ROG Strix Scar 17", score: 96 },
    { id: "MSI-Stealth 16 Studio", score: 96 },
  ],
  travel: [
    { id: "ASUS-ROG Zephyrus G16", score: 92 },
    { id: "MSI-Stealth 16 Studio", score: 92 },
    { id: "Samsung-Galaxy Book4 Ultra", score: 92 },
  ],
  general: [
    { id: "ASUS-ROG Zephyrus G16", score: 95 },
    { id: "MSI-Stealth 16 Studio", score: 95 },
    { id: "MSI-Stealth 14 Studio", score: 94 },
  ],
  "ai-ml": [
    { id: "ASUS-ROG Strix Scar 17", score: 98 },
    { id: "Razer-Blade 16", score: 98 },
    { id: "ASUS-ROG Zephyrus G16", score: 95 },
  ],
  mixed: [
    { id: "ASUS-ROG Zephyrus G16", score: 96 },
    { id: "MSI-Stealth 16 Studio", score: 96 },
    { id: "ASUS-ROG Strix Scar 17", score: 93 },
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
