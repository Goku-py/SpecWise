"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight, Check, Gamepad2, MonitorPlay, Sparkles, Brain, Briefcase, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ProductRecommendationCard } from "@/components/recommendation/ProductRecommendationCard"
import { ExportBuildModal } from "@/components/share/ExportBuildModal"
import { SAMPLE_SCOREABLE } from "@/lib/sample-scoreable"
import { buildQuizSharePath, type QuizShareSelection } from "@/lib/share"
import { BUDGET_OPEN_MAX, useQuizStore, type WorkloadIntent } from "@/store/useQuizStore"
import { cn, formatPrice } from "@/lib/utils"
import { calculateBuildScore, detectBottlenecks, type BuildScoreInput } from "@/lib/recommendation"
import type { RegionConfig } from "@/lib/regions"

interface WorkloadCardDef {
  id: Exclude<WorkloadIntent, null>
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  /** Applied as defaults when this workload is chosen (user can still change later). */
  defaults: { refreshRateGoal?: "60" | "120" | "144+" | "240+"; portabilityPreference?: "desk" | "sometimes" | "always" }
}

const WORKLOAD_CARDS: WorkloadCardDef[] = [
  {
    id: "esports",
    label: "Esports",
    description: "High-FPS competitive titles. Refresh rate and low latency first.",
    icon: Gamepad2,
    defaults: { refreshRateGoal: "240+", portabilityPreference: "sometimes" },
  },
  {
    id: "aaa-gaming",
    label: "AAA 4K Gaming",
    description: "Maxed settings, ray tracing, big open worlds.",
    icon: MonitorPlay,
    defaults: { refreshRateGoal: "144+", portabilityPreference: "desk" },
  },
  {
    id: "video-editing",
    label: "Video Editing / Production",
    description: "Timeline scrubbing, color work, exports. GPU + RAM heavy.",
    icon: Sparkles,
    defaults: { refreshRateGoal: "120" },
  },
  {
    id: "ai-ml",
    label: "Data Science / AI",
    description: "Notebooks, training, local models. CPU cores, RAM, VRAM.",
    icon: Brain,
    defaults: {},
  },
  {
    id: "everyday",
    label: "Everyday Productivity",
    description: "Docs, browsing, calls. Battery and portability matter most.",
    icon: Briefcase,
    defaults: { refreshRateGoal: "60", portabilityPreference: "always" },
  },
]

const REFRESH_OPTIONS = [
  { value: "60", label: "60 Hz" },
  { value: "120", label: "120 Hz" },
  { value: "144+", label: "144+ Hz" },
  { value: "240+", label: "240+ Hz" },
] as const

const PORTABILITY_OPTIONS = [
  { value: "desk", label: "Mostly at a desk", hint: "Weight barely matters" },
  { value: "sometimes", label: "Sometimes carry it", hint: "Café / office hop" },
  { value: "always", label: "Always on the go", hint: "Light + long battery" },
] as const

const UPGRADE_OPTIONS = [
  { value: "must", label: "Must have", hint: "Filter out soldered RAM" },
  { value: "nice", label: "Nice to have", hint: "Boost but don't filter" },
  { value: "no", label: "Don't care", hint: "Score on other merits" },
] as const

const STEPS = ["Workload", "Budget", "Fit"] as const

function formatBudget(v: number): string {
  return v >= BUDGET_OPEN_MAX ? "$3,000+" : formatPrice(v, "USD")
}

export function SpecQuiz({
  region,
  initialSelection,
}: {
  region: RegionConfig
  /** Answers decoded from the share link (`/quiz?workload=…&budget=…`). */
  initialSelection?: QuizShareSelection
}) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [shareOpen, setShareOpen] = useState(false)

  const {
    workloadIntent,
    budgetMax,
    portabilityPreference,
    refreshRateGoal,
    formFactor,
    upgradeabilityPreference,
    selectWorkload,
    setAnswer,
    reset,
    computeTopRecommendations,
  } = useQuizStore()

  // Shared link hydration: applied once after mount (SSR renders the default
  // state, so there is no hydration mismatch — the store is the single source
  // of truth and recomputes the ranking on the next render).
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (!initialSelection) return
    if (initialSelection.workload) selectWorkload(initialSelection.workload)
    if (initialSelection.budget != null) setAnswer("budgetMax", initialSelection.budget)
    if (initialSelection.portability) setAnswer("portabilityPreference", initialSelection.portability)
    if (initialSelection.refresh) setAnswer("refreshRateGoal", initialSelection.refresh)
    if (initialSelection.upgrade) setAnswer("upgradeabilityPreference", initialSelection.upgrade)
    if (initialSelection.form) setAnswer("formFactor", initialSelection.form)
  }, [initialSelection, selectWorkload, setAnswer])

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const prefs: BuildScoreInput = useMemo(() => {
    const g = refreshRateGoal
    return {
      resolution: g === "240+" || g === "144+" || g === "120" ? "1440p" : "1080p",
      prioritizePortability: portabilityPreference === "always",
    }
  }, [refreshRateGoal, portabilityPreference])

  // No memo: computeTopRecommendations reads live store state via get();
  // calling per render keeps recommendations in sync without dep-array tricks.
  const ranked = computeTopRecommendations(SAMPLE_SCOREABLE, 8)

  const topPick = ranked.length > 0 ? ranked[0] : null
  const shareUrl = useMemo(
    () =>
      buildQuizSharePath({
        workload: workloadIntent,
        budget: budgetMax,
        portability: portabilityPreference,
        refresh: refreshRateGoal,
        upgrade: upgradeabilityPreference,
        form: formFactor,
      }),
    [workloadIntent, budgetMax, portabilityPreference, refreshRateGoal, upgradeabilityPreference, formFactor]
  )

  const canNext = step === 0 ? workloadIntent !== null : true

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav aria-label="Quiz progress" className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            {STEPS[Math.min(step, STEPS.length - 1)]}
          </span>
          <span className="font-mono text-xs text-muted">
            {Math.min(step + 1, STEPS.length)} / {STEPS.length}
          </span>
        </div>
        <Progress value={step + 1} max={STEPS.length} />
      </nav>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 0 && (
              <WorkloadStep selected={workloadIntent} onSelect={id => {
                selectWorkload(id)
                const d = WORKLOAD_CARDS.find(c => c.id === id)?.defaults ?? {}
                if (d.refreshRateGoal) setAnswer("refreshRateGoal", d.refreshRateGoal)
                if (d.portabilityPreference) setAnswer("portabilityPreference", d.portabilityPreference)
              }} />
            )}
            {step === 1 && (
              <BudgetStep
                budgetMax={budgetMax}
                onBudget={v => setAnswer("budgetMax", v)}
                refreshRateGoal={refreshRateGoal}
                onRefresh={v => setAnswer("refreshRateGoal", v)}
              />
            )}
            {step === 2 && (
              <FitStep
                portabilityPreference={portabilityPreference}
                onPortability={v => setAnswer("portabilityPreference", v)}
                upgradeabilityPreference={upgradeabilityPreference}
                onUpgradeability={v => setAnswer("upgradeabilityPreference", v)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => (step === 0 ? (reset(), setStep(0)) : go(step - 1))}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {step === 0 ? "Start over" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="lg" disabled={!canNext} onClick={() => go(step + 1)} className="gap-2 bg-gradient-to-b from-accent to-accent-hover hover:glow-accent">
            <span className="font-mono text-xs">NEXT</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={() => go(STEPS.length)} className="gap-2 bg-gradient-to-b from-accent to-accent-hover hover:glow-accent">
            <span className="font-mono text-xs">SEE MATCHES</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Live results below the form — progressive disclosure, not a separate route */}
      <section aria-label="Recommendations" className="mt-12 border-t border-border pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-semibold tracking-tight">Top matches</h2>
            <p className="text-sm text-muted">
              {ranked.length === 0
                ? "No laptops match your budget band yet — widen it on the Budget step."
                : `Re-ranked live as you answer · ${ranked.length} of ${SAMPLE_SCOREABLE.length} candidates`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!topPick}
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" /> Share build
          </Button>
        </div>
        <div className="grid gap-4">
          {ranked.map(p => (
            <ProductRecommendationCard
              key={p.product.id}
              item={p}
              score={calculateBuildScore(p, prefs).score}
              bottlenecks={detectBottlenecks(p, prefs)}
              currency={region.currency}
            />
          ))}
        </div>
      </section>

      <ExportBuildModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        item={topPick}
        score={topPick ? calculateBuildScore(topPick, prefs).score : 0}
        currency={region.currency}
        shareUrl={shareUrl}
      />
    </div>
  )
}

function WorkloadStep({ selected, onSelect }: { selected: WorkloadIntent; onSelect: (id: Exclude<WorkloadIntent, null>) => void }) {
  return (
    <div>
      <h2 className="mb-1 text-2xl font-semibold tracking-tight">What will you primarily use it for?</h2>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Pick one intent. We&apos;ll pre-fill sensible refresh/portability defaults — everything stays editable.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {WORKLOAD_CARDS.map(card => {
          const Icon = card.icon
          const active = selected === card.id
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              aria-pressed={active}
              className={cn(
                "group rounded-xl border p-5 text-left transition",
                active
                  ? "border-accent bg-accent/10 glow-accent"
                  : "border-border bg-card hover:border-accent/30 hover:bg-card-hover",
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <Icon className={cn("h-5 w-5", active ? "text-accent" : "text-muted group-hover:text-accent")} />
                <span className="text-sm font-semibold text-foreground">{card.label}</span>
                {active && <Check className="ml-auto h-4 w-4 text-accent" />}
              </div>
              <p className="text-xs leading-relaxed text-muted">{card.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BudgetStep({
  budgetMax,
  onBudget,
  refreshRateGoal,
  onRefresh,
}: {
  budgetMax: number | null
  onBudget: (v: number | null) => void
  refreshRateGoal: "60" | "120" | "144+" | "240+" | null
  onRefresh: (v: "60" | "120" | "144+" | "240+" | null) => void
}) {
  // Native range input — ponytail: platform control over a slider dependency.
  const value = budgetMax ?? BUDGET_OPEN_MAX
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Budget &amp; display</h2>
        <p className="text-sm leading-relaxed text-muted">Set a ceiling, then how fast the panel should be.</p>
      </div>

      <fieldset>
        <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">Max budget</legend>
        <div className="mb-2 text-center font-mono text-2xl font-semibold text-foreground">
          {formatBudget(value)}
        </div>
        <input
          type="range"
          min={500}
          max={BUDGET_OPEN_MAX}
          step={50}
          value={value}
          onChange={e => onBudget(Number(e.target.value))}
          className="w-full accent-accent"
          aria-label="Maximum budget"
          aria-valuetext={formatBudget(value)}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
          <span>$500</span>
          <span>$1,500</span>
          <span>$3,000+</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">Refresh rate goal</legend>
        <div className="flex flex-wrap gap-2">
          {REFRESH_OPTIONS.map(opt => {
            const active = refreshRateGoal === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onRefresh(active ? null : opt.value)}
                aria-pressed={active}
                className={cn(
                  "rounded border px-3 py-2 text-sm font-mono transition",
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-muted hover:border-border-strong",
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

function FitStep({
  portabilityPreference,
  onPortability,
  upgradeabilityPreference,
  onUpgradeability,
}: {
  portabilityPreference: "desk" | "sometimes" | "always" | null
  onPortability: (v: "desk" | "sometimes" | "always" | null) => void
  upgradeabilityPreference: "must" | "nice" | "no" | null
  onUpgradeability: (v: "must" | "nice" | "no" | null) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Fit &amp; future-proofing</h2>
        <p className="text-sm leading-relaxed text-muted">How often you move it, and whether you&apos;ll upgrade later.</p>
      </div>

      <fieldset>
        <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">Portability</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PORTABILITY_OPTIONS.map(opt => {
            const active = portabilityPreference === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onPortability(active ? null : opt.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-border-strong",
                )}
              >
                <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                <div className="mt-1 text-xs text-muted">{opt.hint}</div>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">Upgradeability</legend>
        <div className="flex flex-wrap gap-2">
          {UPGRADE_OPTIONS.map(opt => {
            const active = upgradeabilityPreference === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onUpgradeability(active ? null : opt.value)}
                aria-pressed={active}
                title={opt.hint}
                className={cn(
                  "rounded border px-3 py-2 text-sm transition",
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-muted hover:border-border-strong",
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          &ldquo;Must have&rdquo; filters out machines with soldered RAM before scoring.
        </p>
      </fieldset>
    </div>
  )
}
