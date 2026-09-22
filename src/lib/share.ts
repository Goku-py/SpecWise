/**
 * Share / export helpers (pure, isomorphic).
 *
 * Two concerns, both side-effect free so they can be unit-tested and called
 * from server or client:
 *  1. Quiz-selection <-> query-string round trip (`/quiz?workload=…&budget=…`),
 *     so a result set can be bookmarked or shared and rehydrated on load.
 *  2. Reddit-ready markdown export of the top recommended build.
 */
import type { ScoreableProduct } from "./recommendation"
import { formatPrice } from "./utils"
import { BUDGET_OPEN_MAX } from "@/store/useQuizStore"
import type {
  FormFactor,
  PortabilityPreference,
  RefreshRateGoal,
  UpgradeabilityPreference,
  WorkloadIntent,
} from "@/store/useQuizStore"

/** The subset of store answers that is worth putting in a share URL. */
export interface QuizShareSelection {
  workload: Exclude<WorkloadIntent, null> | null
  budget: number | null
  portability: PortabilityPreference
  refresh: RefreshRateGoal
  upgrade: UpgradeabilityPreference
  form: FormFactor
}

/** Next.js page `searchParams` shape (values may repeat). */
export type QuizSearchParams = Record<string, string | string[] | undefined>

// Allowlists mirror the store's union types. Anything else is ignored, so a
// hand-edited URL can never put the store into an invalid state.
const WORKLOADS = ["esports", "aaa-gaming", "video-editing", "ai-ml", "everyday"] as const
const PORTABILITIES = ["desk", "sometimes", "always"] as const
const REFRESHES = ["60", "120", "144+", "240+"] as const
const UPGRADES = ["must", "nice", "no"] as const
const FORMS = ["13-14", "15-16", "17+"] as const

export const BUDGET_SLIDER_MIN = 500

function pick<T extends string>(allowed: readonly T[], value: string | undefined): T | null {
  return value != null && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Parse + validate a query object into a selection (invalid values become null). */
export function parseQuizShareParams(params: QuizSearchParams): QuizShareSelection {
  const rawBudget = first(params.budget)
  const parsed = rawBudget != null ? Number(rawBudget) : NaN
  const budget = Number.isFinite(parsed) && String(rawBudget ?? "").trim() !== ""
    ? Math.min(BUDGET_OPEN_MAX, Math.max(BUDGET_SLIDER_MIN, Math.round(parsed)))
    : null

  return {
    workload: pick(WORKLOADS, first(params.workload)),
    budget,
    portability: pick(PORTABILITIES, first(params.portability)),
    refresh: pick(REFRESHES, first(params.refresh)),
    upgrade: pick(UPGRADES, first(params.upgrade)),
    form: pick(FORMS, first(params.form)),
  }
}

/** Build a `/quiz?…` path from the non-null selections (omits empty values). */
export function buildQuizSharePath(selection: Partial<QuizShareSelection>): string {
  const query = new URLSearchParams()
  if (selection.workload) query.set("workload", selection.workload)
  if (selection.budget != null) query.set("budget", String(selection.budget))
  if (selection.portability) query.set("portability", selection.portability)
  if (selection.refresh) query.set("refresh", selection.refresh)
  if (selection.upgrade) query.set("upgrade", selection.upgrade)
  if (selection.form) query.set("form", selection.form)
  const qs = query.toString()
  return qs ? `/quiz?${qs}` : "/quiz"
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
}

function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "—"
}

/**
 * Markdown spec table for the top-ranked build, ready to paste into
 * r/buildapc or r/pcmasterrace. `shareUrl` should be absolute for the
 * attribution link to work once pasted.
 */
export function buildRedditMarkdown(
  item: ScoreableProduct,
  score: number,
  currency: string,
  shareUrl: string
): string {
  const spec = item.laptopSpec
  const pct = Math.round(score * 100)
  const title = `${item.product.brandLabel} ${item.product.name}`.trim()

  const cpu = `${spec.cpuBrand} ${spec.cpuFamily}${spec.cpuCores ? ` · ${spec.cpuCores} cores` : ""}`
  const gpu =
    spec.gpuType === "INTEGRATED"
      ? "Integrated"
      : `${spec.gpuModel ?? "Dedicated GPU"}${spec.gpuVRAMGb ? ` · ${spec.gpuVRAMGb} GB VRAM` : ""}`
  const ram = `${spec.ramAmountGb} GB${spec.ramType ? ` ${spec.ramType}` : ""}`
  const storage = `${spec.storageAmountGb} GB ${spec.storageType}`
  const display =
    `${spec.displaySizeIn}" ${spec.displayPanelType ?? ""} ${spec.displayRefreshHz}Hz`.trim() +
    (spec.displayNits ? ` · ${spec.displayNits} nits` : "")
  const battery =
    [spec.batteryWh ? `${spec.batteryWh} Wh` : null, spec.batteryLifeHr ? `${spec.batteryLifeHr} h` : null]
      .filter(Boolean)
      .join(" · ") || "—"
  const weight = spec.weightKg != null ? `${spec.weightKg} kg` : "—"
  const price =
    item.price != null && Number.isFinite(item.price)
      ? formatPrice(item.price, currency)
      : "Price unavailable"

  const rows: Array<[string, string]> = [
    ["CPU", cpu],
    ["GPU", gpu],
    ["RAM", ram],
    ["Storage", storage],
    ["Display", display],
    ["Battery", battery],
    ["Weight", weight],
    ["Price", price],
    ["Match score", `${pct}%`],
  ]

  const table = [
    "| Component | Spec |",
    "| --- | --- |",
    ...rows.map(([label, value]) => `| ${escapeCell(label)} | ${escapeCell(orDash(value))} |`),
  ].join("\n")

  return `**Top pick: ${title}** — ${pct}% match\n\n${table}\n\nFull breakdown: ${shareUrl}`
}
