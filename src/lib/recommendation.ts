/**
 * Product-spine build score (Task 3). Pure, deterministic, no RNG/LLM.
 * 4 metrics normalized to [0,1], weighted sum with weights always summing to 1.
 * Reuses band helpers from ./recommendation/capabilities where shape allows.
 */
import type { CpuSpecInput, LaptopSpecInput, ProductBase } from "./validation/product"
import { batteryBand, brightnessBand, cpuBand, panelBand, refreshBand } from "./recommendation/capabilities"

// ── Types ─────────────────────────────────────────────────────────────────

export interface ScoreableProduct {
  product: Pick<ProductBase, "id" | "name" | "brandLabel" | "category" | "imageUrl">
  laptopSpec: LaptopSpecInput
  cpuSpec?: CpuSpecInput | null
  /** Lowest in-stock price in major units (e.g. 999.99). null = no price. */
  price?: number | null
}

export interface BuildScoreInput {
  resolution?: "1080p" | "1440p" | "4K"
  /** Boost portability + battery metrics when true. */
  prioritizePortability?: boolean
  /** Fixed four-way weights; must sum to 1. Defaults applied if omitted/malformed. */
  weights?: Partial<BuildWeights>
}

export interface BuildWeights {
  performancePerDollar: number
  thermalEfficiency: number
  displayQuality: number
  portability: number
}

export const DEFAULT_WEIGHTS: BuildWeights = {
  performancePerDollar: 0.4,
  thermalEfficiency: 0.2,
  displayQuality: 0.2,
  portability: 0.2,
}

const PORTABILITY_WEIGHTS: BuildWeights = {
  performancePerDollar: 0.3,
  thermalEfficiency: 0.2,
  displayQuality: 0.2,
  portability: 0.3,
}

export interface BuildScoreBreakdown {
  performancePerDollar: number
  thermalEfficiency: number
  displayQuality: number
  portability: number
}

export interface BuildScore {
  /** Weighted sum, clamped to [0,1]. */
  score: number
  breakdown: BuildScoreBreakdown
  weights: BuildWeights
}

export type BottleneckCode =
  | "VRAM_BELOW_8GB_1440P"
  | "VRAM_BELOW_12GB_4K"
  | "HIGH_TDP_LOW_BATTERY"
  | "RAM_NOT_UPGRADEABLE"

export interface Bottleneck {
  code: BottleneckCode
  message: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/** Resolve weights so they always sum to 1 (partial override or bad input → normalize). */
export function resolveWeights(input?: Partial<BuildWeights>, prioritizePortability?: boolean): BuildWeights {
  const base = prioritizePortability ? PORTABILITY_WEIGHTS : DEFAULT_WEIGHTS
  const merged: BuildWeights = { ...base, ...(input ?? {}) }
  const vals = [merged.performancePerDollar, merged.thermalEfficiency, merged.displayQuality, merged.portability]
  if (vals.some(v => !Number.isFinite(v) || v < 0)) return { ...base }
  const sum = vals.reduce((s, v) => s + v, 0)
  if (sum <= 0) return { ...base }
  return {
    performancePerDollar: merged.performancePerDollar / sum,
    thermalEfficiency: merged.thermalEfficiency / sum,
    displayQuality: merged.displayQuality / sum,
    portability: merged.portability / sum,
  }
}

function gpuTypeValue(spec: LaptopSpecInput): number {
  // DEDICATED/HYBRID benefit from VRAM; INTEGRATED is a fixed mid tier.
  const t = spec.gpuType
  if (t === "INTEGRATED") return 0.3
  const vram = spec.gpuVRAMGb ?? 0
  if (t === "HYBRID") return clamp01(0.5 + vram / 32)
  return clamp01(0.55 + vram / 24)
}

function performanceRaw(spec: LaptopSpecInput, cpu?: CpuSpecInput | null): number {
  const cores = spec.cpuCores ?? cpu?.cores ?? null
  const cpuScore = cpuBand(cores) ?? 0.3
  const bench = spec.cpuBenchmark ?? cpu?.benchmark ?? null
  const benchScore = bench != null && bench > 0 ? clamp01(bench / 20_000) : null
  const cpuPart = benchScore != null ? (cpuScore + benchScore) / 2 : cpuScore
  const gpuPart = gpuTypeValue(spec)
  // CPU slightly outweighs GPU for general builds; gaming pivots via gpuVRAM already inside gpuPart.
  return clamp01(0.55 * cpuPart + 0.45 * gpuPart)
}

/** Higher = better perf per dollar. Missing price → neutral 0.5 (never divide by zero). */
function performancePerDollar(spec: LaptopSpecInput, price: number | null | undefined, cpu?: CpuSpecInput | null): number {
  const perf = performanceRaw(spec, cpu)
  if (price == null || !Number.isFinite(price) || price <= 0) return 0.5
  // Reference: solid mid-range build at ~$1200 scores ~0.65 raw perf → ~1.0 ratio band.
  const ratio = (perf * 1200) / price
  return clamp01(ratio / 1.5)
}

/** Power draw vs battery capacity — lower TDP per Wh is better endurance under load. */
function thermalEfficiency(spec: LaptopSpecInput): number {
  const gpuTdp = spec.gpuTgpW ?? 0
  const batt = spec.batteryWh ?? 0
  const draw = Math.max(gpuTdp, 15)
  if (batt <= 0) {
    // No battery data: moderate score scaled inverse to TDP only (high TDP alone is a mild negative).
    return clamp01(1 - (draw - 15) / 145)
  }
  // Ideal ≥ 8 Wh per 10W of GPU TDP headroom; clamp.
  const whPer10w = batt / (draw / 10)
  return clamp01(whPer10w / 12)
}

function displayQuality(spec: LaptopSpecInput): number {
  const refresh = refreshBand(spec.displayRefreshHz ?? 60)
  const panel = panelBand(spec.displayPanelType ?? null).value
  const nits = brightnessBand(spec.displayNits ?? null)
  const parts: number[] = [refresh, panel]
  if (nits != null) parts.push(nits)
  return clamp01(parts.reduce((s, v) => s + v, 0) / parts.length)
}

function portability(spec: LaptopSpecInput): number {
  const w = spec.weightKg
  const weightScore =
    w == null ? 0.5 : w <= 1.2 ? 1 : w <= 1.5 ? 0.85 : w <= 1.8 ? 0.7 : w <= 2.2 ? 0.45 : w <= 2.8 ? 0.25 : 0.1
  const battHrs = spec.batteryLifeHr ?? null
  const battScore = battHrs == null ? 0.5 : (batteryBand(battHrs) ?? 0.5)
  return clamp01(0.6 * weightScore + 0.4 * battScore)
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Score one Product+laptop build against user preferences.
 * Always returns weights that sum to 1 and score in [0,1].
 */
export function calculateBuildScore(product: ScoreableProduct, userPreferences: BuildScoreInput = {}): BuildScore {
  const spec = product.laptopSpec
  const weights = resolveWeights(userPreferences.weights, userPreferences.prioritizePortability)
  const breakdown: BuildScoreBreakdown = {
    performancePerDollar: performancePerDollar(spec, product.price, product.cpuSpec),
    thermalEfficiency: thermalEfficiency(spec),
    displayQuality: displayQuality(spec),
    portability: portability(spec),
  }
  const score = clamp01(
    breakdown.performancePerDollar * weights.performancePerDollar +
      breakdown.thermalEfficiency * weights.thermalEfficiency +
      breakdown.displayQuality * weights.displayQuality +
      breakdown.portability * weights.portability
  )
  return { score, breakdown, weights }
}

/**
 * Structural warnings for a build. Resolution comes from preferences
 * (default 1440p for VRAM rules).
 */
export function detectBottlenecks(product: ScoreableProduct, userPreferences: BuildScoreInput = {}): Bottleneck[] {
  const spec = product.laptopSpec
  const out: Bottleneck[] = []
  const res = userPreferences.resolution ?? "1440p"
  const vram = spec.gpuVRAMGb
  const isDed = spec.gpuType === "DEDICATED" || spec.gpuType === "HYBRID"

  if (isDed && vram != null) {
    if (res === "4K" && vram < 12) {
      out.push({ code: "VRAM_BELOW_12GB_4K", message: `${vram} GB VRAM is below 12 GB for 4K workloads` })
    } else if (res === "1440p" && vram < 8) {
      out.push({ code: "VRAM_BELOW_8GB_1440P", message: `${vram} GB VRAM is below 8 GB for 1440p gaming` })
    }
  }

  const gpuTdp = spec.gpuTgpW ?? 0
  const batt = spec.batteryWh ?? 0
  // High sustained GPU power + small battery = thermal/battery tradeoff.
  if (gpuTdp >= 100 && (batt === 0 || batt < 70)) {
    out.push({
      code: "HIGH_TDP_LOW_BATTERY",
      message: `High GPU TDP (${gpuTdp}W) with ${batt > 0 ? `${batt}Wh` : "unknown/small"} battery trades endurance for performance`,
    })
  }

  if (spec.ramUpgradeable === false) {
    out.push({ code: "RAM_NOT_UPGRADEABLE", message: "RAM is soldered — cannot be upgraded later" })
  }

  return out
}
