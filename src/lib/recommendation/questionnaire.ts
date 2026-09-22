/**
 * Canonical questionnaire contract (Phase 2B).
 * Q1-Q9 per QUESTIONNAIRE.md. Only workload/useCase is required.
 * Quick (Q1-Q5) and Advanced (+Q6-Q9) produce the SAME shape; skipped = null.
 */
import { z } from "zod"
import type { QuizAnswers, UseCase } from "../types"

export const WORKLOADS = ["study", "office", "code", "gaming", "creative", "travel"] as const
export type Workload = (typeof WORKLOADS)[number]

/** New-workload → legacy weight-profile useCase. */
const WORKLOAD_USE_CASE: Record<Workload, UseCase> = {
  study: "student",
  office: "office",
  code: "coding",
  gaming: "gaming",
  creative: "graphic-design",
  travel: "travel",
}

export interface CanonicalAnswers {
  workload: Workload | null // Q1 — sole required semantic input
  useCase: UseCase // weight profile (Q1-mapped, or legacy passthrough)
  region: string
  maxBudget: number | null // Q2
  os: "windows" | "macos" | null // Q3 (null = no preference)
  carry: "desk" | "sometimes" | "always" | null // Q4
  powerTrade: "battery" | "balanced" | "performance" | null // Q5
  multitask: "light" | "heavy" | "extreme" | null // Q6 → RAM floor
  storageNeed: "docs" | "lots" | "media" | null // Q7 → storage floor
  screen: Array<"sharp" | "smooth" | "vivid" | "touch"> // Q8 (≤2)
  toughBuild: boolean | null // Q9
  dealMinRam16: boolean // deal-breaker toggle ("no 8GB")
  // Legacy-compat HARD inputs (old callers only; new bank never emits these)
  legacyCpuBrand: string | null
  legacyGpuDedicated: boolean
  legacyPorts: string[]
  legacyOsRaw: string | null // chromeos/linux passthrough
  legacyGaming: string | null // reason-only trigger
  legacyUpgradeMust: boolean // reason/bonus trigger
  legacyMinRamExact: number | null // exact floor (bands never round DOWN a request)
  legacyMinStorageExact: number | null
}

export const CanonicalAnswersSchema = z.object({
  workload: z.enum(WORKLOADS).nullable().default(null),
  useCase: z.string().default("general"),
  region: z.string().default("US"),
  maxBudget: z.number().min(0).max(10_000_000).nullable().default(null),
  os: z.enum(["windows", "macos"]).nullable().default(null),
  carry: z.enum(["desk", "sometimes", "always"]).nullable().default(null),
  powerTrade: z.enum(["battery", "balanced", "performance"]).nullable().default(null),
  multitask: z.enum(["light", "heavy", "extreme"]).nullable().default(null),
  storageNeed: z.enum(["docs", "lots", "media"]).nullable().default(null),
  screen: z.array(z.enum(["sharp", "smooth", "vivid", "touch"])).max(2).default([]),
  toughBuild: z.boolean().nullable().default(null),
  dealMinRam16: z.boolean().default(false),
  legacyCpuBrand: z.string().nullable().default(null),
  legacyGpuDedicated: z.boolean().default(false),
  legacyPorts: z.array(z.string()).default([]),
  legacyOsRaw: z.string().nullable().default(null),
  legacyGaming: z.string().nullable().default(null),
  legacyUpgradeMust: z.boolean().default(false),
  legacyMinRamExact: z.number().finite().min(0).max(10_000_000).nullable().default(null),
  legacyMinStorageExact: z.number().finite().min(0).max(10_000_000).nullable().default(null),
})

export const RAM_FLOOR: Record<NonNullable<CanonicalAnswers["multitask"]>, number> = {
  light: 8,
  heavy: 16,
  extreme: 32,
}

export const STORAGE_FLOOR: Record<NonNullable<CanonicalAnswers["storageNeed"]>, number> = {
  docs: 256,
  lots: 512,
  media: 1024,
}

/**
 * Adapter: legacy QuizAnswers → canonical (Phase 2P compat).
 * Dead scoring inputs (displaySize/webcam/security) are dropped here.
 */
export function toCanonical(a: QuizAnswers): CanonicalAnswers {
  const useCase: UseCase = a.useCase ?? "general"
  const workload = ((): Workload | null => {
    switch (a.useCase) {
      case "student": return "study"
      case "office": return "office"
      case "coding": return "code"
      case "gaming": return "gaming"
      case "video-editing":
      case "graphic-design": return "creative"
      case "travel": return "travel"
      default: return null
    }
  })()
  const multitask = a.minRam == null ? null : a.minRam >= 32 ? "extreme" : a.minRam >= 16 ? "heavy" : "light"
  const storageNeed = a.minStorage == null ? null : a.minStorage >= 1024 ? "media" : a.minStorage >= 512 ? "lots" : "docs"
  const screen: CanonicalAnswers["screen"] = []
  for (const q of a.displayQuality) {
    if (q === "high-refresh" && !screen.includes("smooth")) screen.push("smooth")
    else if ((q === "color-accurate" || q === "oled") && !screen.includes("vivid")) screen.push("vivid")
    else if (q === "touch" && !screen.includes("touch")) screen.push("touch")
    else if (q === "bright" && !screen.includes("sharp")) screen.push("sharp")
    if (screen.length >= 2) break
  }
  return {
    workload,
    useCase,
    region: a.region ?? "US",
    maxBudget: a.budgetMax ?? null,
    os: a.os === "windows" || a.os === "macos" ? a.os : null,
    carry: a.portability === "light" ? "always" : a.portability === "balanced" ? "sometimes" : a.portability === "desktop-replacement" ? "desk" : null,
    powerTrade: a.battery === "high" || a.battery === "top" ? "battery" : a.battery === "low" ? "performance" : a.battery === "medium" ? "balanced" : null,
    multitask,
    storageNeed,
    screen,
    toughBuild: a.buildQuality === "very-important" ? true : a.buildQuality == null ? null : false,
    dealMinRam16: false,
    legacyCpuBrand: a.cpuBrand && a.cpuBrand !== "no-preference" ? a.cpuBrand : null,
    legacyGpuDedicated: a.gpu === "dedicated",
    legacyPorts: a.ports ?? [],
    legacyOsRaw: a.os && a.os !== "no-preference" && a.os !== "windows" && a.os !== "macos" ? a.os : null,
    legacyGaming: a.gaming && a.gaming !== "none" ? a.gaming : null,
    legacyUpgradeMust: a.upgradeability === "must-have",
    legacyMinRamExact: a.minRam ?? null,
    legacyMinStorageExact: a.minStorage ?? null,
  }
}

/** Q1 workload → useCase for new-bank answers (same shape, Advanced extends Quick). */
export function workloadToUseCase(w: Workload): UseCase {
  return WORKLOAD_USE_CASE[w]
}
