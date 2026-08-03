import { describe, expect, it } from "vitest"
import { scoreLaptops } from "@/lib/scoring"
import { defaultQuizAnswers } from "@/lib/types"
import type { QuizAnswers } from "@/lib/types"
import { tinyCatalog } from "./fixtures/tiny"

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return { ...defaultQuizAnswers, ...overrides }
}

/** First (best-ranked) recommendation for a single-laptop input. */
function best(laptopId: string, a: QuizAnswers) {
  const laptop = tinyCatalog.find(l => l.id === laptopId)
  if (!laptop) throw new Error(`unknown fixture laptop ${laptopId}`)
  return scoreLaptops([laptop], a)[0]
}

describe("match reasons", () => {
  it("stays within the 4-reason cap across the whole tiny catalog", () => {
    const answerSets: Array<Partial<QuizAnswers>> = [
      {},
      { minRam: 8, battery: "high", gpu: "dedicated", portability: "light", gaming: "esports" },
      { useCase: "coding", minRam: 16, upgradeability: "must-have", displayQuality: ["high-refresh"] },
      { useCase: "ai-ml", battery: "top", gpu: "dedicated" },
    ]
    for (const overrides of answerSets) {
      const a = answers(overrides)
      for (const laptop of tinyCatalog) {
        const [result] = scoreLaptops([laptop], a)
        expect(result.matchReasons.length).toBeLessThanOrEqual(4)
        for (const reason of result.matchReasons) {
          expect(reason.length).toBeGreaterThan(0)
          expect(reason.trim()).toBe(reason)
        }
        expect(new Set(result.matchReasons).size).toBe(result.matchReasons.length)
      }
    }
  })

  it("caps at 4 even when six triggers fire", () => {
    // RAM + battery + GPU + refresh + upgradeability + cores = 6 potential reasons.
    const a = answers({
      minRam: 16,
      battery: "high",
      gpu: "dedicated",
      gaming: "esports",
      upgradeability: "must-have",
      useCase: "coding",
    })
    expect(best("tiny-windows-pro", a).matchReasons).toHaveLength(4)
  })

  it("references actual answer mismatches — no reason for unmet requirements", () => {
    // minRam 32 against an 8 GB laptop: no RAM reason may appear.
    const a = answers({ minRam: 32 })
    const reasons = best("tiny-budget-low", a).matchReasons
    expect(reasons.some(r => r.includes("meets your minimum requirement"))).toBe(false)
  })

  it("spot-checks content keywords per trigger", () => {
    expect(best("tiny-windows-pro", answers({ minRam: 16 })).matchReasons[0]).toMatch(/32 GB RAM meets your minimum requirement/)
    expect(best("tiny-mac-air", answers({ battery: "high" })).matchReasons).toContainEqual("Long battery life (16h) for all-day use")
    expect(best("tiny-gaming-rig", answers({ gpu: "dedicated" })).matchReasons.some(r => r.includes("Dedicated GPU"))).toBe(true)
    expect(best("tiny-ultralight", answers({ portability: "light" })).matchReasons.some(r => r.includes("Ultra-portable at 0.85 kg"))).toBe(true)
    expect(best("tiny-windows-pro", answers({ gaming: "esports" })).matchReasons).toContainEqual("144 Hz display for smooth gaming")
    expect(best("tiny-windows-pro", answers({ upgradeability: "must-have" })).matchReasons).toContainEqual("Upgradeable RAM for future-proofing")
    expect(best("tiny-windows-pro", answers({ useCase: "coding" })).matchReasons).toContainEqual("16-core processor handles demanding workloads")
  })

  it("battery reasons only fire when the laptop clears the 8h threshold", () => {
    expect(best("tiny-gaming-rig", answers({ battery: "high" })).matchReasons).not.toContain("Long battery life (5h) for all-day use")
  })
})

describe("trade-offs", () => {
  it("stays within the 3-item cap across the whole tiny catalog", () => {
    const answerSets: Array<Partial<QuizAnswers>> = [
      { gpu: "dedicated", portability: "light", battery: "high", upgradeability: "must-have", gaming: "esports", os: "windows" },
      { useCase: "travel", battery: "top", portability: "light" },
      { useCase: "gaming", gaming: "aaa", os: "macos" },
    ]
    for (const overrides of answerSets) {
      const a = answers(overrides)
      for (const laptop of tinyCatalog) {
        const [result] = scoreLaptops([laptop], a)
        expect(result.tradeoffs.length).toBeLessThanOrEqual(3)
        for (const t of result.tradeoffs) {
          expect(t.length).toBeGreaterThan(0)
          expect(t.trim()).toBe(t)
        }
      }
    }
  })

  it("caps at 3 even when four triggers fire", () => {
    // Integrated GPU + soldered RAM + 60 Hz + OS mismatch = 4 trade-offs on the MacBook.
    const a = answers({
      gpu: "dedicated",
      upgradeability: "must-have",
      gaming: "esports",
      os: "windows",
    })
    expect(best("tiny-mac-air", a).tradeoffs).toHaveLength(3)
  })

  it("spot-checks content keywords per trigger", () => {
    expect(best("tiny-integrated-15", answers({ gpu: "dedicated" })).tradeoffs[0]).toContain("Integrated graphics")
    expect(best("tiny-desktop-replacement", answers({ portability: "light" })).tradeoffs[0]).toMatch(/Heavier build \(3\.4 kg\)/)
    expect(best("tiny-gaming-rig", answers({ battery: "high" })).tradeoffs[0]).toMatch(/Battery life \(5h\) may not last a full day/)
    expect(best("tiny-mac-air", answers({ upgradeability: "must-have" })).tradeoffs).toContainEqual("RAM is soldered — cannot be upgraded later")
    expect(best("tiny-mac-air", answers({ gaming: "esports" })).tradeoffs[0]).toContain("Standard 60 Hz display")
    expect(best("tiny-mac-air", answers({ os: "windows" })).tradeoffs[0]).toMatch(/Runs macOS, not windows — you may need to adjust to the OS/)
  })

  it("no trade-off for a laptop that meets the requirement", () => {
    const t = best("tiny-windows-pro", answers({ upgradeability: "must-have" })).tradeoffs
    expect(t.some(x => x.includes("RAM is soldered"))).toBe(false)
  })
})
