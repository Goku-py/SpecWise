"use client"

import { useState, useEffect, useRef } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WeightRow {
  label: string
  value: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INPUT_TEXT = "Competitive gaming + software development"

const WEIGHTS: readonly WeightRow[] = [
  { label: "CPU", value: 0.91 },
  { label: "GPU", value: 0.82 },
  { label: "DISPLAY", value: 0.94 },
  { label: "RAM", value: 0.79 },
  { label: "STORAGE", value: 0.85 },
  { label: "PORTABILITY", value: 0.72 },
]

const F_SCORE = 94.8
const RING_RADIUS = 42
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const TYPING_INTERVAL_MS = 50
const COUNT_UP_DURATION_MS = 800

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, durationMs: number, enabled: boolean): number {
  // animatedValue is seeded at target so that a later enable animates
  // target→target (no visual jump), matching the old behavior where the
  // disabled state snapped to target first. While disabled we derive the
  // display value directly and never setState in the effect body.
  const [animatedValue, setAnimatedValue] = useState(target)
  useEffect(() => {
    if (!enabled) return
    let start: number | null = null
    let raf: number
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    const tick = (ts: number) => {
      if (start === null) start = ts
      const elapsed = ts - start
      const progress = Math.min(elapsed / durationMs, 1)
      setAnimatedValue(easeOut(progress) * target)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, enabled])
  return enabled ? animatedValue : target
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TypingInput({ text, animate }: { text: string; animate: boolean }) {
  const [displayed, setDisplayed] = useState(animate ? "" : text)
  const innerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!animate) return
    let idx = 0
    const id = setInterval(() => {
      // Reset to empty on the first tick (callback context — not the effect body)
      if (idx === 0) setDisplayed("")
      idx++
      if (idx > text.length) {
        // Reset after full display
        innerTimeout.current = setTimeout(() => {
          idx = 0
          setDisplayed("")
        }, 2000)
        return
      }
      setDisplayed(text.slice(0, idx))
    }, TYPING_INTERVAL_MS)
    return () => {
      clearInterval(id)
      if (innerTimeout.current) clearTimeout(innerTimeout.current)
    }
  }, [text, animate])

  // Derive the shown text so the non-animated case needs no effect-driven state
  const shown = animate ? displayed : text

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1 font-mono">
        INPUT
      </div>
      <div className="text-foreground font-mono text-xs min-h-[2.5em]">
        {shown}
        <span className="inline-block w-[2px] h-3 bg-accent ml-0.5 animate-pulse" />
      </div>
    </div>
  )
}

function ArrowDown() {
  return (
    <div className="flex items-center gap-2 text-accent py-2">
      <span className="text-xs">&darr;</span>
      <span className="text-[10px] uppercase tracking-wider font-mono">pipeline</span>
      <span className="text-xs">&darr;</span>
    </div>
  )
}

function WeightsSection({ animate }: { animate: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2 font-mono">
        WEIGHTS
      </div>
      <div className="space-y-1.5">
        {WEIGHTS.map((w) => (
          <WeightRow key={w.label} label={w.label} value={w.value} animate={animate} />
        ))}
      </div>
    </div>
  )
}

function WeightRow({
  label,
  value,
  animate,
}: {
  label: string
  value: number
  animate: boolean
}) {
  const current = useCountUp(value, COUNT_UP_DURATION_MS, animate)
  return (
    <div className="flex items-center justify-between font-mono">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-accent-success text-xs tabular-nums">
        {current.toFixed(2)}
      </span>
    </div>
  )
}

function FScoreSection({ animate }: { animate: boolean }) {
  const current = useCountUp(F_SCORE, COUNT_UP_DURATION_MS, animate)
  const offset = RING_CIRCUMFERENCE - (current / 100) * RING_CIRCUMFERENCE

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2 font-mono">
        F-SCORE
      </div>
      <div className="flex items-center gap-4">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          className="flex-shrink-0"
          aria-label={`F-Score: ${F_SCORE.toFixed(1)}%`}
          role="img"
        >
          <circle
            cx="48"
            cy="48"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-border"
          />
          <circle
            cx="48"
            cy="48"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-accent"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        <div>
          <div className="font-mono text-2xl font-bold text-accent tabular-nums">
            {current.toFixed(1)}
            <span className="text-sm">%</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-mono mt-1">
            MATCH CONFIDENCE
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export default function WorkloadDemo() {
  const reducedMotion = useReducedMotion()
  const animate = !reducedMotion

  return (
    <div className="relative z-10 p-6 space-y-3 font-mono text-xs">
      <TypingInput text={INPUT_TEXT} animate={animate} />
      <ArrowDown />
      <WeightsSection animate={animate} />
      <ArrowDown />
      <FScoreSection animate={animate} />
    </div>
  )
}
