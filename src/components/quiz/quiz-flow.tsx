"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowRight, Check, Cpu, Palette, Gamepad2, Plane,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { QuizAnswers } from "@/lib/types"
import type { RegionConfig } from "@/lib/regions"
import { defaultQuizAnswers } from "@/lib/types"
import { fetchRecommendations } from "@/lib/api"
import {
  readValidated,
  removeStored,
  validateQuizAnswers,
  validateQuizMode,
  validateStepIndex,
  writeValidated,
} from "@/lib/storage"
import { GateStep } from "./gate-step"
import type { QuizMode } from "./gate-step"
import { BudgetFieldset, OsFieldset, RamFieldset } from "./quiz-fields"

const ANSWERS_KEY = "specwise-quiz-answers"
const STEP_KEY = "specwise-quiz-step"
const MODE_KEY = "specwise-quiz-mode"

type QuizStepId =
  | "workload"
  | "budget"
  | "review"
  | "constraints"
  | "requirements"
  | "results"

interface StepMeta {
  id: QuizStepId
  label: string
}

const ADVANCED_STEPS: readonly StepMeta[] = [
  { id: "workload", label: "WORKLOAD" },
  { id: "constraints", label: "CONSTRAINTS" },
  { id: "requirements", label: "REQUIREMENTS" },
  { id: "results", label: "RESULTS" },
] as const

const QUICK_STEPS: readonly StepMeta[] = [
  { id: "workload", label: "WORKLOAD" },
  { id: "budget", label: "BUDGET" },
  { id: "review", label: "REVIEW" },
] as const

const stepsFor = (m: QuizMode | null): readonly StepMeta[] =>
  m === "quick" ? QUICK_STEPS : ADVANCED_STEPS

interface WorkloadCard {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  preset: Partial<QuizAnswers>
  badges: string[]
}

const WORKLOAD_CARDS: WorkloadCard[] = [
  {
    id: "sw-dev",
    label: "Software Dev & LLMs",
    description: "Coding, VMs, Docker, local LLM inference, and data science workloads.",
    icon: Cpu,
    badges: ["CPU", "GPU", "RAM", "Storage"],
    preset: {
      useCase: "coding",
      cpuBrand: "no-preference",
      minRam: 16,
      minStorage: 512,
      gpu: "integrated",
      battery: "medium",
      portability: "balanced",
      displaySize: "no-preference",
      displayQuality: [],
      gaming: "none",
      upgradeability: "nice-to-have",
      buildQuality: "nice-to-have",
      ports: [],
      webcam: null,
      security: [],
    },
  },
  {
    id: "3d-cad",
    label: "3D Motion & CAD",
    description: "Adobe Creative Suite, Blender, 3D modeling, and illustration.",
    icon: Palette,
    badges: ["GPU", "Display", "RAM", "Storage"],
    preset: {
      useCase: "graphic-design",
      cpuBrand: "no-preference",
      minRam: 16,
      minStorage: 512,
      gpu: "dedicated",
      battery: "medium",
      portability: "balanced",
      displaySize: "no-preference",
      displayQuality: ["color-accurate"],
      gaming: "none",
      upgradeability: "nice-to-have",
      buildQuality: "nice-to-have",
      ports: [],
      webcam: null,
      security: [],
    },
  },
  {
    id: "comp-gaming",
    label: "Competitive Gaming",
    description: "Esports, high-FPS titles, and streaming with low latency.",
    icon: Gamepad2,
    badges: ["GPU", "Display", "Storage", "Upgrade"],
    preset: {
      useCase: "gaming",
      cpuBrand: "no-preference",
      minRam: 16,
      minStorage: 1024,
      gpu: "dedicated",
      battery: "low",
      portability: "desktop-replacement",
      displaySize: "no-preference",
      displayQuality: ["high-refresh"],
      gaming: "esports",
      upgradeability: "must-have",
      buildQuality: "not-important",
      ports: [],
      webcam: null,
      security: [],
    },
  },
  {
    id: "portability",
    label: "Portability & Field Work",
    description: "Lightweight, long battery, built for travel and on-site work.",
    icon: Plane,
    badges: ["Battery", "Portability", "Display", "Weight"],
    preset: {
      useCase: "travel",
      cpuBrand: "no-preference",
      minRam: 8,
      minStorage: 256,
      gpu: "integrated",
      battery: "high",
      portability: "light",
      displaySize: "13-14",
      displayQuality: ["bright"],
      gaming: "none",
      upgradeability: "not-important",
      buildQuality: "nice-to-have",
      ports: [],
      webcam: null,
      security: [],
    },
  },
]

const STORAGE_OPTIONS: { value: string; label: string; numVal: number }[] = [
  { value: "256", label: "256 GB", numVal: 256 },
  { value: "512", label: "512 GB", numVal: 512 },
  { value: "1024", label: "1 TB", numVal: 1024 },
  { value: "2048", label: "2 TB", numVal: 2048 },
  { value: "", label: "Any", numVal: 0 },
]

const DISPLAY_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: "13-14", label: "13\u201314\"" },
  { value: "15-16", label: "15\u201316\"" },
  { value: "17+", label: "17+\"" },
  { value: "no-preference", label: "Any" },
]

interface ReqOption {
  value: string
  label: string
}

const GPU_OPTIONS: ReqOption[] = [
  { value: "integrated", label: "Integrated" },
  { value: "dedicated", label: "Dedicated" },
  { value: "maybe", label: "Either" },
]

const BATTERY_OPTIONS: ReqOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "top", label: "Top Priority" },
]

const UPGRADE_OPTIONS: ReqOption[] = [
  { value: "must-have", label: "Must Have" },
  { value: "nice-to-have", label: "Nice to Have" },
  { value: "not-important", label: "Not Important" },
]

const BUILD_OPTIONS: ReqOption[] = [
  { value: "not-important", label: "Not Important" },
  { value: "nice-to-have", label: "Nice to Have" },
  { value: "very-important", label: "Very Important" },
]

const PORT_OPTIONS: ReqOption[] = [
  { value: "usb-c", label: "USB-C" },
  { value: "usb-a", label: "USB-A" },
  { value: "hdmi", label: "HDMI" },
  { value: "ethernet", label: "Ethernet" },
  { value: "sd-card", label: "SD Card" },
]

const DISPLAY_QUALITY_OPTIONS: ReqOption[] = [
  { value: "basic", label: "Basic" },
  { value: "bright", label: "Bright" },
  { value: "color-accurate", label: "Color Accurate" },
  { value: "oled", label: "OLED" },
  { value: "high-refresh", label: "High Refresh" },
  { value: "touch", label: "Touch" },
]

const SECURITY_OPTIONS: ReqOption[] = [
  { value: "tpm", label: "TPM" },
  { value: "fingerprint", label: "Fingerprint" },
  { value: "face", label: "IR Camera" },
  { value: "smart-card", label: "Smart Card" },
]

const WEBCAM_OPTIONS: ReqOption[] = [
  { value: "not-important", label: "Not Important" },
  { value: "nice-to-have", label: "Nice to Have" },
  { value: "very-important", label: "Very Important" },
]

const REFURBISHED_OPTIONS: ReqOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
]

function formatWeight(v: number): string {
  return v.toFixed(1) + " kg"
}

function scrollToTop() {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
}

export function QuizFlow({ region }: { region: RegionConfig }) {
  const router = useRouter()

  // Pure defaults in lazy initializers — no localStorage reads, so server and
  // client HTML match during SSR hydration. Restore happens post-mount below.
  const [mode, setMode] = useState<QuizMode | null>(null)

  const [stepIndex, setStepIndex] = useState(0)

  const [answers, setAnswers] = useState<QuizAnswers>(() => ({ ...defaultQuizAnswers }))

  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration gate: mounted-flag pattern for SSR-safe localStorage restore
  useEffect(() => setMounted(true), [])

  // Restore saved progress exactly once, after hydration. This effect is
  // declared before the persist effects and reads storage in the same commit
  // the persists are still gated on `mounted`, so restore always sees the
  // pristine stored values and the persists then write the restored state back.
  useEffect(() => {
    if (!mounted) return

    // FIX 4: legacy visitors (pre-gate) have specwise-quiz-step but no
    // specwise-quiz-mode → restore straight into ADVANCED at the clamped
    // step. A corrupt mode value counts as absent, so the rule applies too.
    let restoredMode: QuizMode | null = null
    // readValidated absorbs the try/catch: missing/malformed/invalid reads
    // as null. A corrupt mode value counts as absent, so the legacy rule
    // below applies to it too.
    const savedMode = readValidated(MODE_KEY, validateQuizMode)
    if (savedMode !== null) {
      restoredMode = savedMode
    } else {
      // Legacy rule applies only to a FINITE stored step — corrupt values
      // ("not-a-number", empty) must fall through to the gate, not into
      // advanced. Number("") is 0 (finite), so empty is rejected explicitly
      // (validateStepIndex returns null for it).
      const savedStep = readValidated(STEP_KEY, validateStepIndex)
      if (savedStep !== null) {
        restoredMode = "advanced"
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: apply restored quiz state exactly once, post-hydration
    setMode(restoredMode)

    // FIX 3: sanitize the saved step — floor + clamp to the restored mode's
    // steps (validateStepIndex already rejected non-finite values).
    let restoredStep = 0
    const saved = readValidated(STEP_KEY, validateStepIndex)
    if (saved !== null) {
      const idx = Math.floor(saved)
      const lastStep = stepsFor(restoredMode).length - 1
      restoredStep = Math.max(0, Math.min(idx, lastStep))
    }
    setStepIndex(restoredStep)

    // Merge saved answers over the defaults (validated; unknown keys dropped).
    // Corrupt/invalid blob — keep the pure defaults.
    const parsed = readValidated(ANSWERS_KEY, validateQuizAnswers)
    if (parsed) {
      setAnswers(prev => ({ ...prev, ...parsed }))
    }
  }, [mounted])

  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    // Skip until hydration restores saved progress — otherwise this debounced
    // write would clobber the stored answers with the pure defaults before the
    // restore effect has read them.
    if (typeof window === "undefined" || !mounted) return
    const timeout = setTimeout(() => {
      writeValidated(ANSWERS_KEY, answers)
    }, 300)
    return () => clearTimeout(timeout)
  }, [answers, mounted])

  useEffect(() => {
    // Only persist the step once a mode is chosen. Gating on mode keeps the
    // FIX 4 legacy contract unambiguous: STEP present without MODE can only
    // mean a pre-gate visitor, because this effect never plants STEP alone
    // (and the restore effect reads storage before any persist writes).
    if (typeof window === "undefined" || !mounted || mode === null) return
    writeValidated(STEP_KEY, stepIndex)
  }, [stepIndex, mode, mounted])

  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return
    if (mode) {
      writeValidated(MODE_KEY, mode)
    } else {
      removeStored(MODE_KEY)
    }
  }, [mode, mounted])

  const updateAnswer = useCallback(
    <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
      setAnswers(prev => ({ ...prev, [key]: value }))
    },
    [],
  )

  const toggleArray = useCallback(
    <K extends keyof QuizAnswers>(key: K, value: string, max?: number) => {
      setAnswers(prev => {
        const arr = (prev[key] as string[]) || []
        if (arr.includes(value)) {
          return { ...prev, [key]: arr.filter(v => v !== value) }
        }
        if (max && arr.length >= max) return prev
        return { ...prev, [key]: [...arr, value] }
      })
    },
    [],
  )

  const selectMode = useCallback((m: QuizMode) => {
    setMode(m)
    setStepIndex(0)
    scrollToTop()
  }, [])

  const goNext = useCallback(() => {
    setStepIndex(s => Math.min(s + 1, stepsFor(mode).length - 1))
    scrollToTop()
  }, [mode])

  const goBack = useCallback(() => {
    if (mode && stepIndex === 0) {
      // FIX 5: heading back from step 0 is a true restart — clear answers,
      // step, and their storage so a quick run never inherits advanced-path
      // fields. MODE_KEY clears via the mode persist effect below.
      setMode(null)
      setStepIndex(0)
      setAnswers({ ...defaultQuizAnswers })
      removeStored(ANSWERS_KEY)
      removeStored(STEP_KEY)
      return
    }
    setStepIndex(s => Math.max(s - 1, 0))
    scrollToTop()
  }, [mode, stepIndex])

  const handleWorkloadSelect = useCallback(
    (card: WorkloadCard) => {
      setAnswers(prev => ({ ...prev, ...card.preset }))
      goNext()
    },
    [goNext],
  )

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      const body = { ...answers, region: region.code, email: email.trim() }
      const data = await fetchRecommendations(body as QuizAnswers)
      writeValidated("specwise-results", data)
      writeValidated("specwise-answers", { ...answers, region: region.code })
      removeStored(ANSWERS_KEY)
      removeStored(STEP_KEY)
      removeStored(MODE_KEY)
      router.push("/results")
    } catch (err) {
      console.error("Quiz submit error:", err)
      setSubmitError(
        "Something went wrong. Please check your connection and try again.",
      )
      setSubmitting(false)
    }
  }, [answers, email, region.code, router])

  const steps = stepsFor(mode)
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]
  const isLast = stepIndex === steps.length - 1

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <QuizShellSkeleton />
      </div>
    )
  }

  if (mode === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div key="gate" className="animate-fade-in">
          <GateStep onSelect={selectMode} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav aria-label="Quiz progress" className="mb-10">
        <ol className="flex items-center justify-between gap-1" role="list">
          {steps.map((s, i) => {
            const isCompleted = stepIndex > i
            const isCurrent = stepIndex === i
            return (
              <li
                key={s.id}
                className="flex flex-1 items-center"
                aria-current={isCurrent ? "step" : undefined}
              >
                <div className="flex w-full flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-mono font-semibold transition-colors",
                      isCompleted
                        ? "border-accent bg-accent text-background"
                        : isCurrent
                          ? "border-transparent bg-gradient-to-b from-accent to-accent-hover text-background"
                          : "border-border text-muted",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-[10px] font-mono uppercase tracking-wider sm:block",
                      isCurrent
                        ? "text-accent"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 hidden h-px flex-1 sm:block",
                      isCompleted ? "bg-accent" : "bg-border",
                    )}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div key={currentStep.id} className="animate-fade-in">
        {currentStep.id === "workload" && (
          <WorkloadStep onSelect={handleWorkloadSelect} />
        )}
        {currentStep.id === "constraints" && (
          <ConstraintsStep answers={answers} region={region} onUpdate={updateAnswer} />
        )}
        {currentStep.id === "requirements" && (
          <RequirementsStep
            answers={answers}
            onUpdate={updateAnswer}
            onToggleArray={toggleArray}
          />
        )}
        {currentStep.id === "budget" && (
          <QuickBudgetStep answers={answers} region={region} onUpdate={updateAnswer} />
        )}
        {(currentStep.id === "review" || currentStep.id === "results") && (
          <ResultsStep
            answers={answers}
            email={email}
            setEmail={setEmail}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>
        <div>
          {!isLast && (
            <Button
              size="lg"
              onClick={goNext}
              disabled={currentStep.id === "workload" && !answers.useCase}
              className="gap-2 bg-gradient-to-b from-accent to-accent-hover hover:glow-accent"
            >
              <span className="font-mono text-xs">NEXT</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function WorkloadStep({ onSelect }: { onSelect: (card: WorkloadCard) => void }) {
  return (
    <div>
      <h2 className="mb-1 text-2xl font-semibold tracking-tight">
        What is your primary workload?
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Choose a scenario that best describes your use case. You can refine
        constraints and requirements on the next steps.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {WORKLOAD_CARDS.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card)}
              className="group rounded-xl border border-border bg-card p-5 text-left transition hover:border-accent/30 hover:bg-card-hover hover:glow-accent"
            >
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-5 w-5 text-accent" />
                <span className="text-sm font-semibold text-foreground">{card.label}</span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted">{card.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {card.badges.map(badge => (
                  <span
                    key={badge}
                    className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ConstraintsStep({
  answers,
  region,
  onUpdate,
}: {
  answers: QuizAnswers
  region: RegionConfig
  onUpdate: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
}) {
  const weightLimit =
    answers.portability === "light"
      ? 1.5
      : answers.portability === "desktop-replacement"
        ? 4.5
        : 2.5

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Set your constraints</h2>
        <p className="text-sm leading-relaxed text-muted">
          All fields are optional. Use Next to skip ahead.
        </p>
      </div>

      <BudgetFieldset answers={answers} region={region} onUpdate={onUpdate} />
      <OsFieldset answers={answers} onUpdate={onUpdate} />
      <RamFieldset answers={answers} onUpdate={onUpdate} />

      <fieldset>
        <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
          Weight Limit
        </legend>
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={weightLimit}
            onChange={e => {
              const v = Number(e.target.value)
              if (v <= 1.5) {
                onUpdate("portability", "light")
              } else if (v >= 3.5) {
                onUpdate("portability", "desktop-replacement")
              } else {
                onUpdate("portability", "balanced")
              }
            }}
            className="w-full accent-accent"
            aria-label="Weight tolerance"
          />
          <div className="flex justify-between text-xs font-mono text-muted">
            <span>0.0 kg</span>
            <span className="text-foreground font-semibold">{formatWeight(weightLimit)}</span>
            <span>5.0 kg</span>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
          Minimum Storage
        </legend>
        <div className="flex flex-wrap gap-2">
          {STORAGE_OPTIONS.map(opt => {
            const selected =
              opt.value === "" ? answers.minStorage === null : answers.minStorage === opt.numVal
            return (
              <button
                key={opt.value}
                onClick={() => onUpdate("minStorage", selected ? null : opt.numVal)}
                className={cn(
                  "rounded border px-3 py-2 text-sm font-mono transition",
                  selected
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

      <fieldset>
        <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
          Display Size
        </legend>
        <div className="flex flex-wrap gap-2">
          {DISPLAY_SIZE_OPTIONS.map(opt => {
            const selected = answers.displaySize === opt.value
            return (
              <button
                key={opt.value}
                onClick={() =>
                  onUpdate(
                    "displaySize",
                    selected ? null : (opt.value as QuizAnswers["displaySize"]),
                  )
                }
                className={cn(
                  "rounded border px-3 py-2 text-sm transition",
                  selected
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

function RequirementsStep({
  answers,
  onUpdate,
  onToggleArray,
}: {
  answers: QuizAnswers
  onUpdate: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
  onToggleArray: <K extends keyof QuizAnswers>(key: K, value: string, max?: number) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Refine your requirements</h2>
        <p className="text-sm leading-relaxed text-muted">
          Fine-tune your preferences. Everything is optional. Use Next to skip.
        </p>
      </div>

      <ReqSingleGroup
        label="Graphics"
        options={GPU_OPTIONS}
        value={answers.gpu ?? ""}
        onChange={v => onUpdate("gpu", v ? (v as QuizAnswers["gpu"]) : null)}
      />
      <ReqSingleGroup
        label="Battery Importance"
        options={BATTERY_OPTIONS}
        value={answers.battery ?? ""}
        onChange={v => onUpdate("battery", v ? (v as QuizAnswers["battery"]) : null)}
      />
      <ReqSingleGroup
        label="Upgradeability"
        options={UPGRADE_OPTIONS}
        value={answers.upgradeability ?? ""}
        onChange={v =>
          onUpdate("upgradeability", v ? (v as QuizAnswers["upgradeability"]) : null)
        }
      />
      <ReqSingleGroup
        label="Build Quality"
        options={BUILD_OPTIONS}
        value={answers.buildQuality ?? ""}
        onChange={v =>
          onUpdate("buildQuality", v ? (v as QuizAnswers["buildQuality"]) : null)
        }
      />
      <ReqMultiGroup
        label="Ports Needed"
        options={PORT_OPTIONS}
        selected={answers.ports ?? []}
        onToggle={v => onToggleArray("ports", v, 3)}
        max={3}
      />
      <ReqMultiGroup
        label="Display Quality"
        options={DISPLAY_QUALITY_OPTIONS}
        selected={answers.displayQuality ?? []}
        onToggle={v => onToggleArray("displayQuality", v, 3)}
        max={3}
      />
      <ReqMultiGroup
        label="Security Features"
        options={SECURITY_OPTIONS}
        selected={answers.security ?? []}
        onToggle={v => onToggleArray("security", v, 3)}
        max={3}
      />
      <ReqSingleGroup
        label="Webcam"
        options={WEBCAM_OPTIONS}
        value={answers.webcam ?? ""}
        onChange={v => onUpdate("webcam", v ? (v as QuizAnswers["webcam"]) : null)}
      />
      <ReqSingleGroup
        label="Refurbished OK"
        options={REFURBISHED_OPTIONS}
        value={
          answers.refurbished === true ? "true" : answers.refurbished === false ? "false" : ""
        }
        onChange={v =>
          onUpdate(
            "refurbished",
            v === "true" ? true : v === "false" ? false : null,
          )
        }
      />
    </div>
  )
}

function QuickBudgetStep({
  answers,
  region,
  onUpdate,
}: {
  answers: QuizAnswers
  region: RegionConfig
  onUpdate: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">
          {"Set your budget"}
        </h2>
        <p className="text-sm text-muted">
          {"All optional — we'll use smart defaults. Use Next to continue."}
        </p>
      </div>

      <BudgetFieldset answers={answers} region={region} onUpdate={onUpdate} />
      <OsFieldset answers={answers} onUpdate={onUpdate} />
      <RamFieldset answers={answers} onUpdate={onUpdate} />
      <ReqSingleGroup
        label="Battery"
        options={BATTERY_OPTIONS}
        value={answers.battery ?? ""}
        onChange={v => onUpdate("battery", v ? (v as QuizAnswers["battery"]) : null)}
      />
    </div>
  )
}

function ReqSingleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(selected ? "" : opt.value)}
              className={cn(
                "rounded border px-3 py-2 text-sm transition",
                selected
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
  )
}

function ReqMultiGroup({
  label,
  options,
  selected,
  onToggle,
  max,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
  max?: number
}) {
  const atMax = max !== undefined && selected.length >= max
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
        {label}
        {max != null && (
          <span className="ml-1 text-[10px] text-muted">
            {"(max " + max}
            {selected.length > 0 ? " \u00b7 " + selected.length + "/" + max : ""}
            {")"}
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isSelected = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              disabled={!isSelected && atMax}
              className={cn(
                "flex items-center gap-1.5 rounded border px-3 py-2 text-sm transition",
                isSelected
                  ? "border-accent bg-accent/10 text-accent"
                  : atMax
                    ? "border-border bg-card text-muted opacity-50"
                    : "border-border bg-card text-muted hover:border-border-strong",
              )}
            >
              {isSelected && (
                <span className="flex h-4 w-4 items-center justify-center rounded bg-accent text-[10px] text-background">
                  {"\u2713"}
                </span>
              )}
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function ResultsStep({
  answers,
  email,
  setEmail,
  submitting,
  submitError,
  onSubmit,
}: {
  answers: QuizAnswers
  email: string
  setEmail: (v: string) => void
  submitting: boolean
  submitError: string
  onSubmit: () => void
}) {
  const summaryItems: { label: string; value: string }[] = []
  if (answers.useCase) summaryItems.push({ label: "Workload", value: answers.useCase })
  if (answers.os) summaryItems.push({ label: "OS", value: answers.os })
  if (answers.minRam) summaryItems.push({ label: "RAM", value: answers.minRam + " GB+" })
  if (answers.minStorage)
    summaryItems.push({ label: "Storage", value: answers.minStorage + " GB+" })
  if (answers.gpu) summaryItems.push({ label: "GPU", value: answers.gpu })
  if (answers.battery) summaryItems.push({ label: "Battery", value: answers.battery })
  if (answers.portability)
    summaryItems.push({ label: "Portability", value: answers.portability })
  if (answers.displaySize && answers.displaySize !== "no-preference")
    summaryItems.push({ label: "Display", value: answers.displaySize })
  if (answers.displayQuality.length > 0)
    summaryItems.push({
      label: "Display Quality",
      value: answers.displayQuality.join(", "),
    })
  if (answers.gaming && answers.gaming !== "none")
    summaryItems.push({ label: "Gaming", value: answers.gaming })
  if (answers.ports.length > 0)
    summaryItems.push({ label: "Ports", value: answers.ports.join(", ") })
  if (answers.security.length > 0)
    summaryItems.push({ label: "Security", value: answers.security.join(", ") })
  if (answers.webcam) summaryItems.push({ label: "Webcam", value: answers.webcam })
  if (answers.refurbished !== null)
    summaryItems.push({
      label: "Refurbished",
      value: answers.refurbished ? "Yes" : "No",
    })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Review your profile</h2>
        <p className="text-sm leading-relaxed text-muted">
          Check your selections below, then submit to get matched laptops.
        </p>
      </div>

      {summaryItems.length > 0 && (
        <div className="rounded border border-border bg-card p-4">
          <h3 className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
            Your selections
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {summaryItems.map(item => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                  {item.label}
                </span>
                <span className="text-sm font-mono text-foreground capitalize">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded border border-border bg-card p-4">
        <label htmlFor="quiz-email" className="text-sm font-medium text-foreground">
          Get these results by email{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="quiz-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent font-mono"
        />
      </div>

      {submitError && (
        <div className="rounded border border-accent-danger/30 bg-accent-danger/10 px-4 py-3 text-sm text-accent-danger">
          {submitError}
        </div>
      )}

      <Button
        size="lg"
        onClick={onSubmit}
        disabled={submitting}
        className="w-full gap-2 bg-gradient-to-b from-accent to-accent-hover hover:glow-accent"
      >
        <span className="font-mono text-xs">
          {submitting ? "FINDING MATCHES..." : "SEE MY MATCHES"}
        </span>
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  )
}

function QuizShellSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-2/3 animate-pulse rounded bg-card-hover" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-card-hover" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  )
}
