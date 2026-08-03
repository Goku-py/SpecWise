import { describe, expect, it } from "vitest"
import { scoreLaptops } from "@/lib/scoring"
import { defaultQuizAnswers } from "@/lib/types"
import type { QuizAnswers } from "@/lib/types"
import { tinyCatalog, tinySparse } from "./fixtures/tiny"
import { catalogLaptops } from "./fixtures/catalog"

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return { ...defaultQuizAnswers, ...overrides }
}

function assertValidResults(
  results: Array<{ id: string; matchScore: number }>
): void {
  expect(results.length).toBeGreaterThanOrEqual(0)
  expect(results.length).toBeLessThanOrEqual(12)
  for (const r of results) {
    expect(r.id.length).toBeGreaterThan(0)
    expect(r.matchScore).toBeGreaterThanOrEqual(0)
    expect(r.matchScore).toBeLessThanOrEqual(100)
  }
}

describe("default answers", () => {
  it("produce valid output on the tiny catalog", () => {
    assertValidResults(scoreLaptops(tinyCatalog, defaultQuizAnswers))
  })

  it("produce valid output on the full catalog", () => {
    const results = scoreLaptops(catalogLaptops, defaultQuizAnswers)
    assertValidResults(results)
    expect(results).toHaveLength(12)
  })
})

describe("nullable optional answers never throw", () => {
  it("explicitly-nulled optionals behave like defaults", () => {
    const a = answers({
      cpuBrand: null,
      refurbished: false,
      ports: [],
      security: [],
      displayQuality: [],
      os: null,
      gaming: null,
      upgradeability: null,
      buildQuality: null,
      webcam: null,
      budgetMin: null,
      budgetMax: null,
    })
    assertValidResults(scoreLaptops(catalogLaptops, a))
  })

  it("a fully sparse laptop survives every dimension being answered", () => {
    const a = answers({
      useCase: "gaming",
      budgetMin: 800,
      budgetMax: 1200,
      os: "windows",
      cpuBrand: "intel",
      minRam: 8,
      minStorage: 256,
      gpu: "dedicated",
      battery: "top",
      portability: "light",
      displayQuality: ["oled", "touch", "bright"],
      gaming: "aaa",
      upgradeability: "must-have",
      buildQuality: "very-important",
      ports: ["thunderbolt", "ethernet"],
    })
    const results = scoreLaptops([tinySparse], a)
    assertValidResults(results)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe("tiny-sparse")
  })
})

describe("extreme answer values behave sanely", () => {
  it("budget 0–0 (impossible) is graceful — nothing is eliminated", () => {
    const results = scoreLaptops(catalogLaptops, answers({ budgetMin: 0, budgetMax: 0 }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
  })

  it("absurdly high budget floor is graceful", () => {
    const results = scoreLaptops(catalogLaptops, answers({ budgetMin: 1_000_000 }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
  })

  it("budget ceiling below every laptop is graceful", () => {
    const results = scoreLaptops(catalogLaptops, answers({ budgetMax: 1 }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
  })

  it("huge minRam is graceful (step skipped, no elimination)", () => {
    const results = scoreLaptops(catalogLaptops, answers({ minRam: 1024 }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
  })

  it("minRam 36 keeps only ≥36 GB laptops", () => {
    const results = scoreLaptops(catalogLaptops, answers({ minRam: 36 }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) expect(r.ramAmount).toBeGreaterThanOrEqual(36)
  })

  it("minStorage beyond every laptop is graceful", () => {
    const results = scoreLaptops(catalogLaptops, answers({ minStorage: 8192 }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
  })

  it("requiring every port is graceful", () => {
    const allPorts = ["hdmi", "usb-a", "usb-c", "thunderbolt", "sd-card", "ethernet", "headphone"]
    const results = scoreLaptops(catalogLaptops, answers({ ports: allPorts }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
  })

  it("os: macos on the catalog returns macOS laptops only", () => {
    const results = scoreLaptops(catalogLaptops, answers({ os: "macos" }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(7)
    for (const r of results) expect(r.os).toBe("macOS")
  })

  it("gpu: dedicated returns dedicated-GPU laptops only", () => {
    const results = scoreLaptops(catalogLaptops, answers({ gpu: "dedicated" }))
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) expect(r.gpuType).toBe("dedicated")
  })

  it("everything-maxed answers do not throw and return a ranked set", () => {
    const a = answers({
      useCase: "gaming",
      budgetMin: 1000,
      budgetMax: 1500,
      os: "windows",
      cpuBrand: "intel",
      minRam: 32,
      minStorage: 1024,
      gpu: "dedicated",
      battery: "high",
      portability: "light",
      displayQuality: ["high-refresh"],
      gaming: "esports",
      upgradeability: "must-have",
      buildQuality: "very-important",
      ports: ["thunderbolt", "ethernet", "sd-card"],
    })
    const results = scoreLaptops(catalogLaptops, a)
    assertValidResults(results)
    expect(results.length).toBeGreaterThan(0)
  })
})

describe("answers that the engine never reads", () => {
  it("webcam, security, displaySize and refurbished do not affect scoring", () => {
    const base = answers({ useCase: "coding", minRam: 16 })
    const variants: Array<Partial<QuizAnswers>> = [
      { ...base, webcam: "very-important", security: ["fingerprint", "tpm"], displaySize: "17+", refurbished: true },
      { ...base, webcam: "not-important", security: [], displaySize: "13-14", refurbished: false },
    ]
    const baseline = JSON.stringify(scoreLaptops(catalogLaptops, base))
    for (const v of variants) {
      expect(JSON.stringify(scoreLaptops(catalogLaptops, { ...defaultQuizAnswers, ...v }))).toBe(baseline)
    }
  })
})
