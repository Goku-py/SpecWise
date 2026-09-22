/**
 * Quiz answers store (Zustand). Single source of truth for questionnaire
 * state + budget filtering + top-N product recommendations.
 */
import { create } from "zustand"
import { calculateBuildScore, type BuildScoreInput, type ScoreableProduct } from "@/lib/recommendation"

export type PrimaryWorkload =
  | "study"
  | "office"
  | "code"
  | "gaming"
  | "creative"
  | "travel"
  | null

/** Task-4 intent labels (quiz step 1 cards). */
export type WorkloadIntent =
  | "esports"
  | "aaa-gaming"
  | "video-editing"
  | "ai-ml"
  | "everyday"
  | null

const WORKLOAD_TO_PRIMARY: Record<Exclude<WorkloadIntent, null>, Exclude<PrimaryWorkload, null>> = {
  esports: "gaming",
  "aaa-gaming": "gaming",
  "video-editing": "creative",
  "ai-ml": "code",
  everyday: "office",
}

/** Slider position at this value = open-ended upper bound. */
export const BUDGET_OPEN_MAX = 3000

/** Inclusive major-unit bands; null bounds = open-ended. */
export interface BudgetBand {
  id: string
  label: string
  min: number | null
  max: number | null
}

export const BUDGET_BANDS: BudgetBand[] = [
  { id: "under-700", label: "Under $700", min: null, max: 699 },
  { id: "700-1199", label: "$700 – $1,199", min: 700, max: 1199 },
  { id: "1200-1799", label: "$1,200 – $1,799", min: 1200, max: 1799 },
  { id: "1800+", label: "$1,800+", min: 1800, max: null },
]

export type PortabilityPreference = "desk" | "sometimes" | "always" | null
export type RefreshRateGoal = "60" | "120" | "144+" | "240+" | null
export type FormFactor = "13-14" | "15-16" | "17+" | null
export type UpgradeabilityPreference = "must" | "nice" | "no" | null

export interface QuizStoreAnswers {
  primaryWorkload: PrimaryWorkload
  workloadIntent: WorkloadIntent
  budgetBandId: string | null
  /** Max spend in major units; null = unset; BUDGET_OPEN_MAX = open-ended ($3,000+). */
  budgetMax: number | null
  portabilityPreference: PortabilityPreference
  refreshRateGoal: RefreshRateGoal
  formFactor: FormFactor
  upgradeabilityPreference: UpgradeabilityPreference
}

export interface QuizStoreState extends QuizStoreAnswers {
  setAnswer: <K extends keyof QuizStoreAnswers>(
    key: K,
    value: QuizStoreAnswers[K]
  ) => void
  /** Sets workloadIntent + maps to primaryWorkload in one update. */
  selectWorkload: (intent: Exclude<WorkloadIntent, null>) => void
  reset: () => void

  /** Keep products matching selected band + budgetMax + upgradeability must. */
  filterByBudgetBand: (products: ScoreableProduct[]) => ScoreableProduct[]
  /** Score + sort desc, return top N (default 8). */
  computeTopRecommendations: (products: ScoreableProduct[], topN?: number) => ScoreableProduct[]
}

const initialAnswers: QuizStoreAnswers = {
  primaryWorkload: null,
  workloadIntent: null,
  budgetBandId: null,
  budgetMax: null,
  portabilityPreference: null,
  refreshRateGoal: null,
  formFactor: null,
  upgradeabilityPreference: null,
}

function selectedBand(budgetBandId: string | null): BudgetBand | null {
  if (!budgetBandId) return null
  return BUDGET_BANDS.find(b => b.id === budgetBandId) ?? null
}

function scorePreferences(state: QuizStoreAnswers): BuildScoreInput {
  const g = state.refreshRateGoal
  const resolution = g === "240+" || g === "144+" || g === "120" ? "1440p" : "1080p"
  return {
    resolution,
    prioritizePortability: state.portabilityPreference === "always",
  }
}

/** Products with no price pass budget filter only when no band/max is active. */
export function productInBand(product: ScoreableProduct, band: BudgetBand | null): boolean {
  if (!band) return true
  const p = product.price
  if (p == null || !Number.isFinite(p)) return false
  if (band.min != null && p < band.min) return false
  if (band.max != null && p > band.max) return false
  return true
}

export const useQuizStore = create<QuizStoreState>()((set, get) => ({
  ...initialAnswers,

  setAnswer: (key, value) => set({ [key]: value } as Pick<QuizStoreState, typeof key>),

  selectWorkload: intent =>
    set({ workloadIntent: intent, primaryWorkload: WORKLOAD_TO_PRIMARY[intent] }),

  reset: () => set({ ...initialAnswers }),

  filterByBudgetBand: products => {
    const state = get()
    const band = selectedBand(state.budgetBandId)
    const cap = state.budgetMax
    const mustUpgrade = state.upgradeabilityPreference === "must"
    return products.filter(p => {
      if (!productInBand(p, band)) return false
      // budgetMax open at BUDGET_OPEN_MAX (no upper cap). Missing price fails a real cap.
      if (cap != null && cap < BUDGET_OPEN_MAX) {
        if (p.price == null || !Number.isFinite(p.price) || p.price > cap) return false
      }
      if (mustUpgrade && p.laptopSpec.ramUpgradeable === false) return false
      return true
    })
  },

  computeTopRecommendations: (products, topN = 8) => {
    const prefs = scorePreferences(get())
    return get()
      .filterByBudgetBand(products)
      .map(p => ({ p, s: calculateBuildScore(p, prefs).score }))
      .sort((a, b) => b.s - a.s)
      .slice(0, topN)
      .map(x => x.p)
  },
}))
