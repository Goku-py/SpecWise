/**
 * Versioned scoring weights (Phase 2F). Sums to 1.0 per useCase.
 * Derived from the Phase-0 PRIORITIES mapping: value=budget,
 * build=build+upgradeability. Any change requires fixture-diff review.
 */
import type { UseCase } from "../types"

export const SCORING_VERSION = "v2.phase2"
export const WEIGHTS_VERSION = "v1"

export const DIMS_9 = ["cpu", "gpu", "ram", "storage", "battery", "portability", "display", "build", "value"] as const
export type Dim9 = (typeof DIMS_9)[number]

export const WEIGHTS_V1: Record<UseCase, Record<Dim9, number>> = {
  student: { cpu: 0.10, gpu: 0.02, ram: 0.10, storage: 0.08, battery: 0.18, portability: 0.15, display: 0.05, build: 0.07, value: 0.25 },
  office: { cpu: 0.12, gpu: 0.02, ram: 0.10, storage: 0.08, battery: 0.18, portability: 0.10, display: 0.08, build: 0.07, value: 0.25 },
  coding: { cpu: 0.22, gpu: 0.05, ram: 0.22, storage: 0.12, battery: 0.10, portability: 0.08, display: 0.05, build: 0.04, value: 0.12 },
  gaming: { cpu: 0.15, gpu: 0.30, ram: 0.15, storage: 0.10, battery: 0.03, portability: 0.02, display: 0.10, build: 0.03, value: 0.12 },
  "video-editing": { cpu: 0.20, gpu: 0.20, ram: 0.18, storage: 0.12, battery: 0.05, portability: 0.03, display: 0.10, build: 0.02, value: 0.10 },
  "graphic-design": { cpu: 0.15, gpu: 0.15, ram: 0.15, storage: 0.10, battery: 0.05, portability: 0.05, display: 0.22, build: 0.03, value: 0.10 },
  travel: { cpu: 0.10, gpu: 0.02, ram: 0.08, storage: 0.08, battery: 0.25, portability: 0.25, display: 0.03, build: 0.04, value: 0.15 },
  general: { cpu: 0.10, gpu: 0.02, ram: 0.10, storage: 0.10, battery: 0.15, portability: 0.10, display: 0.10, build: 0.13, value: 0.20 },
  "ai-ml": { cpu: 0.20, gpu: 0.30, ram: 0.20, storage: 0.10, battery: 0.02, portability: 0.02, display: 0.03, build: 0.05, value: 0.08 },
  mixed: { cpu: 0.15, gpu: 0.10, ram: 0.15, storage: 0.10, battery: 0.10, portability: 0.08, display: 0.08, build: 0.09, value: 0.15 },
}

export function baseWeights(useCase: UseCase | null | undefined): Record<Dim9, number> {
  return { ...(WEIGHTS_V1[useCase ?? "general"] ?? WEIGHTS_V1.general) }
}
