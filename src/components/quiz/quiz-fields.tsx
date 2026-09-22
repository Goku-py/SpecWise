"use client"

import { cn } from "@/lib/utils"
import { RangeSlider } from "@/components/ui/range-slider"
import { usdToLocal } from "@/lib/regions"
import { formatPrice } from "@/lib/utils"
import type { QuizAnswers } from "@/lib/types"
import type { RegionConfig } from "@/lib/regions"

const OS_OPTIONS: { value: string; label: string }[] = [
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
  { value: "chromeos", label: "ChromeOS" },
  { value: "linux", label: "Linux" },
  { value: "no-preference", label: "No Preference" },
]

const RAM_OPTIONS: { value: string; label: string; numVal: number }[] = [
  { value: "8", label: "8 GB", numVal: 8 },
  { value: "16", label: "16 GB", numVal: 16 },
  { value: "32", label: "32 GB", numVal: 32 },
  { value: "64", label: "64 GB", numVal: 64 },
  { value: "", label: "Any", numVal: 0 },
]

export function BudgetFieldset({
  answers,
  region,
  onUpdate,
}: {
  answers: QuizAnswers
  region: RegionConfig
  onUpdate: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
        Budget Range
      </legend>
      <RangeSlider
        min={usdToLocal(200, region.code)}
        max={usdToLocal(5000, region.code)}
        step={usdToLocal(50, region.code)}
        valueMin={answers.budgetMin ?? 0}
        valueMax={answers.budgetMax ?? usdToLocal(5000, region.code)}
        onChange={(min, max) => {
          onUpdate("budgetMin", min)
          onUpdate("budgetMax", max)
        }}
        formatLabel={v => formatPrice(v, region.currency)}
      />
    </fieldset>
  )
}

export function OsFieldset({
  answers,
  onUpdate,
}: {
  answers: QuizAnswers
  onUpdate: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
        Operating System
      </legend>
      <div className="flex flex-wrap gap-2">
        {OS_OPTIONS.map(opt => {
          const selected = answers.os === opt.value
          return (
            <button
              key={opt.value}
              onClick={() =>
                onUpdate("os", selected ? null : (opt.value as QuizAnswers["os"]))
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
  )
}

export function RamFieldset({
  answers,
  onUpdate,
}: {
  answers: QuizAnswers
  onUpdate: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-mono uppercase tracking-wider text-muted">
        Minimum RAM
      </legend>
      <div className="flex flex-wrap gap-2">
        {RAM_OPTIONS.map(opt => {
          const selected =
            opt.value === "" ? answers.minRam === null : answers.minRam === opt.numVal
          return (
            <button
              key={opt.value}
              onClick={() => onUpdate("minRam", selected ? null : opt.numVal)}
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
  )
}
