/**
 * Shared client DTOs for results decomposition, re-ranking, and view models.
 * Results lane owns this file; quiz/catalog lanes import read-only.
 */
import type { RecommendedLaptop, QuizAnswers } from "./types"
import { decomposeScores, weightsForUseCase } from "./decomposition"
import type { DimName, ResultDecomposition } from "./decomposition"

// Re-export types from decomposition for downstream consumers
export type { DimName, ResultDecomposition }

// ── Additional types ──

/** Radar axis order is contract (spec order: CPU GPU Display RAM Storage Battery Portability Build). */
export const RADAR_DIMS: readonly DimName[] = [
  "cpu", "gpu", "display", "ram", "storage", "battery", "portability", "build",
] as const

export interface WeightedDim {
  dim: DimName
  score: number        // 0..1, from decomposition
  weight: number       // 0..1, from weightsForUseCase
  contribution: number // score * weight
  deltaVsPool: number  // (score − poolMean) * 100, percentage points
}

export interface RankedBreakdown {
  laptopId: string
  rank: number
  dimensions: WeightedDim[]
  poolMean: ResultDecomposition
}

export interface DeltaBreakdown {
  laptopId: string
  rank: number
  headlineDelta: number
  baseline: "next-best" | "pool-mean"
  topDrivers: Array<{ dim: DimName; label: string; delta: number }>
}

// ── Computation ──

function meanDim(laptops: readonly RecommendedLaptop[], dim: DimName): number {
  if (laptops.length === 0) return 0
  let sum = 0
  for (const l of laptops) {
    sum += decomposeScores(l)[dim]
  }
  return sum / laptops.length
}

export function computeRankedBreakdown(
  laptops: readonly RecommendedLaptop[],
  answers: QuizAnswers
): RankedBreakdown[] {
  if (laptops.length === 0) return []

  const weights = weightsForUseCase(answers.useCase)

  // Decompose + weighted total for each laptop
  const scored = laptops.map((laptop, idx) => {
    const scores = decomposeScores(laptop)
    const weightedTotal = RADAR_DIMS.reduce((sum, d) => sum + scores[d] * weights[d], 0)
    return { laptop, scores, weightedTotal, originalRank: idx }
  })

  // Sort by weighted total descending
  scored.sort((a, b) => b.weightedTotal - a.weightedTotal)

  // Pool means
  const poolMean: ResultDecomposition = {
    cpu: meanDim(laptops, "cpu"),
    gpu: meanDim(laptops, "gpu"),
    display: meanDim(laptops, "display"),
    ram: meanDim(laptops, "ram"),
    storage: meanDim(laptops, "storage"),
    battery: meanDim(laptops, "battery"),
    portability: meanDim(laptops, "portability"),
    build: meanDim(laptops, "build"),
  }

  return scored.map(({ laptop, scores }, rank) => {
    const dimensions: WeightedDim[] = RADAR_DIMS.map((dim) => ({
      dim,
      score: scores[dim],
      weight: weights[dim],
      contribution: scores[dim] * weights[dim],
      deltaVsPool: (scores[dim] - poolMean[dim]) * 100,
    }))

    return {
      laptopId: laptop.id,
      rank: rank + 1,
      dimensions,
      poolMean,
    }
  })
}
