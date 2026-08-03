import { describe, expect, it } from "vitest"
import { scoreLaptops } from "@/lib/scoring"
import { defaultQuizAnswers } from "@/lib/types"
import type { QuizAnswers } from "@/lib/types"
import { tinyBudgetLow, tinyIntegrated15, tinyMacAir, tinyWindowsPro } from "./fixtures/tiny"
import { catalogLaptops } from "./fixtures/catalog"

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return { ...defaultQuizAnswers, ...overrides }
}

describe("F-score ordering", () => {
  it("a laptop matching all explicitly-answered dimensions ranks above partial matches", () => {
    // minRam 16 filters out tiny-budget-low (8 GB); the other three survive
    // every step, so ranking (not filtering) decides the winner.
    const a = answers({
      useCase: "coding",
      minRam: 16,
      battery: "high",
      upgradeability: "must-have",
    })
    const result = scoreLaptops([tinyWindowsPro, tinyMacAir, tinyIntegrated15, tinyBudgetLow], a)

    expect(result.map(r => r.id)).toEqual(["tiny-windows-pro", "tiny-mac-air", "tiny-integrated-15"])
    expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore)
  })

  it("a better-specced laptop wins over a weaker one for a demanding profile", () => {
    // No elimination here: gpu filter is off, so both laptops are in the pool.
    const a = answers({ useCase: "gaming", displayQuality: ["high-refresh"] })
    const result = scoreLaptops([tinyWindowsPro, tinyMacAir], a)

    // tiny-windows-pro: dedicated 8GB GPU, 144 Hz, 32 GB — beats the MacBook's
    // integrated GPU + 60 Hz + 16 GB on every gaming-weighted dimension.
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("tiny-windows-pro")
    expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore)
  })

  it("match scores stay within [0, 100] (F-score within [0, 1])", () => {
    const cases: Array<Partial<QuizAnswers>> = [
      { useCase: "gaming" },
      { useCase: "coding", minRam: 32, os: "macos", gpu: "dedicated", battery: "top" },
      { useCase: "travel", portability: "light", budgetMin: 0, budgetMax: 100000 },
      { useCase: "ai-ml", minStorage: 2048, displayQuality: ["oled", "touch"] },
    ]
    for (const overrides of cases) {
      for (const r of scoreLaptops(catalogLaptops, answers(overrides))) {
        expect(r.matchScore).toBeGreaterThanOrEqual(0)
        expect(r.matchScore).toBeLessThanOrEqual(100)
        expect(r.matchScore / 100).toBeGreaterThanOrEqual(0)
        expect(r.matchScore / 100).toBeLessThanOrEqual(1)
      }
    }
  })

  it("removing an answered match lowers the score (monotonicity)", () => {
    const withMatch = answers({ useCase: "coding", minRam: 32 })
    const withoutMatch = answers({ useCase: "coding" })

    const [withMinRam] = scoreLaptops([tinyWindowsPro], withMatch)
    const [withoutMinRam] = scoreLaptops([tinyWindowsPro], withoutMatch)

    expect(withMinRam.matchScore).toBeGreaterThan(withoutMinRam.matchScore)

    // Same for battery: high priority + 9h battery beats un-answered default.
    const withBattery = answers({ useCase: "coding", battery: "high" })
    const [withBatteryScore] = scoreLaptops([tinyWindowsPro], withBattery)
    expect(withBatteryScore.matchScore).toBeGreaterThan(withoutMinRam.matchScore)
  })

  it("is deterministic — identical input produces identical output", () => {
    const a = answers({
      useCase: "video-editing",
      os: "windows",
      budgetMin: 800,
      budgetMax: 2500,
      minRam: 16,
      gpu: "dedicated",
      displayQuality: ["color-accurate", "high-refresh"],
    })

    const first = scoreLaptops(catalogLaptops, a)
    const second = scoreLaptops(catalogLaptops, a)

    expect(second).toEqual(first)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })
})
