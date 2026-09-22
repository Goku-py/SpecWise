"use client"

import { useEffect, useRef, useState } from "react"

interface BootLine {
  text: string
  delayMs: number
  variant?: "ok" | "warn" | "accent"
}

interface BootSequenceProps {
  laptopCount: number
  onComplete?: () => void
}

const DEFAULT_LINES: (laptopCount: number) => BootLine[] = (laptopCount) => [
  { text: "> SPECWISE ENGINE", delayMs: 0, variant: "accent" },
  { text: "> INITIALIZING HARDWARE DATABASE ✓", delayMs: 180, variant: "ok" },
  { text: `> LOADING ${laptopCount} MACHINES ✓`, delayMs: 360, variant: "ok" },
  { text: "> LOADING THERMAL PROFILES ✓", delayMs: 520, variant: "ok" },
  { text: "> LOADING PANEL DATABASE ✓", delayMs: 680, variant: "ok" },
  { text: "> INITIALIZING F-SCORE ENGINE ✓", delayMs: 840, variant: "ok" },
  { text: "> ENGINE READY", delayMs: 1050, variant: "accent" },
]

const SESSION_KEY = "specwise-boot-seen"

export function BootSequence({ laptopCount, onComplete }: BootSequenceProps) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [revealedLines, setRevealedLines] = useState<number>(0)
  const onCompleteRef = useRef(onComplete)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function dismiss() {
    setFading(true)
    dismissTimer.current = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1")
      setVisible(false)
      onCompleteRef.current?.()
    }, 300)
  }

  useEffect(() => {
    // Keep the latest onComplete reachable from the timers/dismiss
    onCompleteRef.current = onComplete

    // Skip if already seen
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      return
    }

    // Skip if user prefers reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      sessionStorage.setItem(SESSION_KEY, "1")
      onCompleteRef.current?.()
      return
    }

    // Defer the reveal to the next frame (setState from a callback context)
    const showRaf = requestAnimationFrame(() => setVisible(true))

    const lines = DEFAULT_LINES(laptopCount)
    const timers: ReturnType<typeof setTimeout>[] = []

    lines.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setRevealedLines(i + 1)
        }, line.delayMs)
      )
    })

    // Auto-dismiss after last line + 200ms for "ENGINE READY" to read
    const totalDuration = lines[lines.length - 1].delayMs + 250
    timers.push(
      setTimeout(() => {
        dismiss()
      }, totalDuration)
    )

    return () => {
      cancelAnimationFrame(showRaf)
      timers.forEach(clearTimeout)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
    // onComplete is only written to a ref here, so re-running when it changes is safe
  }, [laptopCount, onComplete])

  useEffect(() => {
    if (!visible) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [visible])

  if (!visible) return null

  const lines = DEFAULT_LINES(laptopCount)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Boot sequence. Press Escape to skip."
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 300ms ease-out",
      }}
    >
      <div className="mx-4 w-full max-w-lg rounded border border-border bg-card p-6 font-mono text-xs leading-relaxed shadow-2xl">
        {lines.slice(0, revealedLines).map((line, i) => {
          const colorClass =
            line.variant === "ok"
              ? "text-accent-success"
              : line.variant === "accent"
                ? "text-accent"
                : "text-muted"
          return (
            <div key={i} className={colorClass}>
              {line.text}
            </div>
          )
        })}
        {revealedLines < lines.length && (
          <span className="inline-block h-3 w-1.5 animate-pulse bg-accent" />
        )}
      </div>
    </div>
  )
}
