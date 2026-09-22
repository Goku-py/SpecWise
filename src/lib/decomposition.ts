/**
 * Derived client-side projection (Phase 2M). NOT a ranker.
 * Bands/weights are shared imports from the canonical engine — this module
 * holds no independent formula. Null capabilities render as 0.5 neutral ONLY
 * for display; the authoritative score never uses these values.
 */
import type { RecommendedLaptop, BatteryPriority, PortabilityPref, UseCase, QuizAnswers } from "./types"
import {
  cpuBand, gpuBand, ramBand, storageBand, batteryBand, portabilityBand,
  refreshBand, panelBand, brightnessBand, buildBand,
} from "./recommendation/capabilities"
import { baseWeights } from "./recommendation/weights"
import { rescoreWithOverlay as engineRescore, type RankedItem } from "./recommendation/engine"
import { DIMS_9, type Dim9 } from "./recommendation/weights"

export type DimName =
  | "cpu" | "gpu" | "display" | "ram" | "storage"
  | "battery" | "portability" | "build"

export type ResultDecomposition = Record<DimName, number>

const NEUTRAL = 0.5

function scoreCpu(l: { cpuCores: number | null }): number {
  return cpuBand(l.cpuCores) ?? NEUTRAL
}

function scoreGpu(l: { gpuType: string; gpuVRAM: number | null }): number {
  return gpuBand(l.gpuType, l.gpuVRAM).value
}

function scoreRam(l: { ramAmount: number }): number {
  return ramBand(l.ramAmount)
}

function scoreStorage(l: { storageAmount: number }): number {
  return storageBand(l.storageAmount)
}

function scoreBattery(l: { batteryLife: number | null }, _priority: BatteryPriority | null): number {
  return batteryBand(l.batteryLife) ?? NEUTRAL
}

function scorePortability(l: { weight: number | null }, _pref: PortabilityPref | null): number {
  return portabilityBand(l.weight, null) ?? NEUTRAL
}

function scoreDisplay(
  l: { displayRefreshRate: number; displayBrightness: number | null; displayPanelType: string | null },
): number {
  const subs: number[] = [refreshBand(l.displayRefreshRate), panelBand(l.displayPanelType).value]
  const b = brightnessBand(l.displayBrightness)
  if (b != null) subs.push(b)
  return subs.reduce((s, v) => s + v, 0) / subs.length
}

function scoreBuild(l: { reviewScore: number | null }): number {
  // buildMaterial is absent from RecommendedLaptop; reviewScore proxy, display-only.
  if (l.reviewScore && l.reviewScore >= 4.5) return 1.0
  if (l.reviewScore && l.reviewScore >= 4.0) return 0.8
  if (l.reviewScore && l.reviewScore >= 3.5) return 0.6
  return 0.5
}

export function decomposeScores(laptop: RecommendedLaptop): ResultDecomposition {
  return {
    cpu: scoreCpu(laptop),
    gpu: scoreGpu(laptop),
    ram: scoreRam(laptop),
    storage: scoreStorage(laptop),
    battery: scoreBattery(laptop, null),
    portability: scorePortability(laptop, null),
    display: scoreDisplay(laptop),
    build: scoreBuild(laptop),
  }
}

const DIM8_TO_DIM9: Record<DimName, Dim9> = {
  cpu: "cpu", gpu: "gpu", display: "display", ram: "ram", storage: "storage",
  battery: "battery", portability: "portability", build: "build",
}

export function weightsForUseCase(useCase: UseCase | null | undefined): Record<DimName, number> {
  const w9 = baseWeights(useCase)
  const out = {} as Record<DimName, number>
  let sum = 0
  for (const d of Object.keys(DIM8_TO_DIM9) as DimName[]) {
    out[d] = w9[DIM8_TO_DIM9[d]]
    sum += out[d]
  }
  for (const d of Object.keys(out) as DimName[]) out[d] /= sum
  return out
}

function toRankedItem(l: RecommendedLaptop): RankedItem {
  const meta = l.scoringMeta
  if (meta) {
    const caps = {} as RankedItem["caps"]
    for (const d of DIMS_9) {
      const v = meta.caps[d]
      caps[d] = { value: v, confidence: v == null ? 0 : 0.8, source: v == null ? "missing" : "measured" }
    }
    const weights = {} as RankedItem["weights"]
    for (const d of DIMS_9) weights[d] = meta.weights[d] ?? 0
    return {
      // Overlay only reads price/weight/id/brand/model off laptop; the rest
      // rides along untouched. Cast is safe for this path.
      laptop: { ...l, priceMissing: l.priceMissing ?? l.price <= 0 } as unknown as RankedItem["laptop"],
      score: l.matchScore / 100,
      caps,
      weights,
      penalties: meta.penalties,
      bonuses: meta.bonuses,
      satisfied: [],
      missed: [],
      structuralNotes: [],
      explanation: { why: [], strengths: [], compromises: [], whyAbove: null },
    }
  }
  // Stale pre-v2 payload (no meta): display-estimate fallback, overlay-only.
  const d = decomposeScores(l)
  const caps = {} as RankedItem["caps"]
  const get = (k: DimName): number => d[k]
  const map: Record<Dim9, number | null> = {
    cpu: get("cpu"), gpu: get("gpu"), ram: get("ram"), storage: get("storage"),
    battery: get("battery"), portability: get("portability"), display: get("display"),
    build: get("build"), value: 0.5,
  }
  for (const k of DIMS_9) caps[k] = { value: map[k], confidence: 0.5, source: "inferred" }
  const w9 = baseWeights(null)
  return {
    laptop: { ...l, priceMissing: l.priceMissing ?? l.price <= 0 } as unknown as RankedItem["laptop"],
    score: l.matchScore / 100,
    caps,
    weights: w9,
    penalties: 0,
    bonuses: 0,
    satisfied: [],
    missed: [],
    structuralNotes: [],
    explanation: { why: [], strengths: [], compromises: [], whyAbove: null },
  }
}

/**
 * Slider overlay: SAME engine scorer, caller-supplied 8-dim weights
 * (value keeps its profile weight). Never overwrites stored scores silently —
 * callers must label the result "Adjusted view".
 */
export function rescoreWithOverlay(
  results: RecommendedLaptop[],
  _answers: QuizAnswers,
  slider: Record<DimName, number>,
  valueWeight = 0.12
): RecommendedLaptop[] {
  if (results.length === 0) return results
  const overlay = {} as Record<Dim9, number>
  for (const d of Object.keys(DIM8_TO_DIM9) as DimName[]) overlay[DIM8_TO_DIM9[d]] = slider[d] ?? 0
  overlay.value = valueWeight
  const ranked = results.map(toRankedItem)
  const rescored = engineRescore(ranked, overlay)
  const scoreById = new Map(rescored.map(r => [r.laptop.id, Math.round(r.score * 100)]))
  return rescored.map(r => {
    const orig = results.find(x => x.id === r.laptop.id)!
    return { ...orig, matchScore: scoreById.get(orig.id) ?? orig.matchScore, adjustedView: true }
  })
}
