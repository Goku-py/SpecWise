/**
 * Canonical user profile (Phase 2C). HARD/SOFT/PRIORITY/DEAL_BREAKER/TRADE_OFF
 * stay distinct — never collapsed into one number here. Deterministic.
 */
import type { CanonicalAnswers } from "./questionnaire"
import { RAM_FLOOR, STORAGE_FLOOR } from "./questionnaire"
import { baseWeights, type Dim9 } from "./weights"

export interface HardConstraints {
  budgetMin: number | null // legacy-compat min bound (Q2 range UI)
  budgetMax: number | null // Q2 max
  os: string | null // effective OS HARD (canonical or legacy passthrough)
  minRam: number | null
  minStorage: number | null
  cpuBrand: string | null // legacy-compat only
  gpuDedicated: boolean // legacy-compat only
  ports: string[] // legacy-compat only
}

export interface UserProfile {
  useCase: CanonicalAnswers["useCase"]
  region: string
  hard: HardConstraints
  weights: Record<Dim9, number> // sums to 1, PRIORITY-adjusted
  dealMinRam16: boolean
  tradeOffs: Array<{ id: "battery-for-power" | "power-for-battery"; note: string }>
  contradictions: string[] // surfaced, never silent
}

export function buildProfile(c: CanonicalAnswers, legacyBudgetMin: number | null): UserProfile {
  // Exact legacy floors win over bands (bands never round a request DOWN).
  const bandRam = c.multitask ? RAM_FLOOR[c.multitask] : 0
  const bandStorage = c.storageNeed ? STORAGE_FLOOR[c.storageNeed] : 0
  const minRam = c.dealMinRam16
    ? 16
    : Math.max(bandRam, c.legacyMinRamExact ?? 0) || null
  const minStorage = Math.max(bandStorage, c.legacyMinStorageExact ?? 0) || null
  const weights = baseWeights(c.useCase)
  // PRIORITY multipliers (Q4/Q5/Q8), then renormalize to 1.
  const mul: Record<Dim9, number> = {
    cpu: 1, gpu: 1, ram: 1, storage: 1, battery: 1, portability: 1, display: 1, build: 1, value: 1,
  }
  if (c.powerTrade === "performance") { mul.cpu *= 1.4; mul.gpu *= 1.3; mul.battery *= 0.4 }
  else if (c.powerTrade === "battery") { mul.battery *= 1.6; mul.cpu *= 0.8; mul.gpu *= 0.8 }
  if (c.carry === "always") { mul.portability *= 1.5; mul.battery *= 1.2 }
  else if (c.carry === "desk") { mul.portability *= 0.5 }
  if (c.screen.length > 0) mul.display *= 1 + 0.25 * c.screen.length
  if (c.toughBuild === true) mul.build *= 1.5
  let sum = 0
  for (const d of Object.keys(weights) as Dim9[]) { weights[d] *= mul[d]; sum += weights[d] }
  for (const d of Object.keys(weights) as Dim9[]) weights[d] /= sum

  const tradeOffs: UserProfile["tradeOffs"] = []
  if (c.powerTrade === "performance") {
    tradeOffs.push({ id: "battery-for-power", note: "Trades battery life for performance" })
  }
  const contradictions: string[] = []
  const osEffective = c.os ?? c.legacyOsRaw
  if ((osEffective === "macos" || c.legacyOsRaw === "macos") && c.legacyGpuDedicated) {
    contradictions.push("macOS laptops in this catalog use integrated graphics — dedicated-GPU requirement lifted, OS kept")
  }
  return {
    useCase: c.useCase,
    region: c.region,
    hard: {
      budgetMin: legacyBudgetMin,
      budgetMax: c.maxBudget,
      os: osEffective,
      minRam,
      minStorage,
      cpuBrand: c.legacyCpuBrand,
      gpuDedicated: c.legacyGpuDedicated,
      ports: c.legacyPorts,
    },
    weights,
    dealMinRam16: c.dealMinRam16,
    tradeOffs,
    contradictions,
  }
}
