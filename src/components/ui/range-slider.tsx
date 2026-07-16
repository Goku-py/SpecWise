"use client"

import { useCallback, useState, useRef } from "react"

interface RangeSliderProps {
  min: number
  max: number
  step: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
  formatLabel?: (v: number) => string
}

// ponytail: two stacked <input type="range"> + editable number fields for precision.
// Inline <style> avoids Tailwind pseudo-element flakiness.
export function RangeSlider({ min, max, step, valueMin, valueMax, onChange, formatLabel }: RangeSliderProps) {
  const MIN_GAP = step * 4

  // Text input state (string to allow typing in progress)
  const [minText, setMinText] = useState(String(valueMin))
  const [maxText, setMaxText] = useState(String(valueMax))
  const [minErr, setMinErr] = useState("")
  const [maxErr, setMaxErr] = useState("")

  // Sync text when slider moves (but not during user typing)
  const isTypingMin = useRef(false)
  const isTypingMax = useRef(false)
  const syncFromSlider = useCallback(() => {
    if (!isTypingMin.current) {
      setMinText(String(valueMin))
      setMinErr("")
    }
    if (!isTypingMax.current) {
      setMaxText(String(valueMax))
      setMaxErr("")
    }
  }, [valueMin, valueMax])
  // Call sync on render via effect — simpler: just update in render
  // Since we can't use hooks conditionally, inline it below

  const clamp = (v: number) => Math.round(Math.max(min, Math.min(max, v)) / step) * step

  const commitMin = useCallback((raw: string) => {
    isTypingMin.current = false
    const n = Number(raw)
    if (raw.trim() === "" || isNaN(n)) {
      setMinText(String(valueMin))
      setMinErr("")
      return
    }
    const clamped = clamp(n)
    const final = Math.min(clamped, valueMax - MIN_GAP)
    setMinText(String(final))
    setMinErr("")
    onChange(final, valueMax)
  }, [valueMin, valueMax, min, max, step, MIN_GAP, onChange, clamp])

  const commitMax = useCallback((raw: string) => {
    isTypingMax.current = false
    const n = Number(raw)
    if (raw.trim() === "" || isNaN(n)) {
      setMaxText(String(valueMax))
      setMaxErr("")
      return
    }
    const clamped = clamp(n)
    const final = Math.max(clamped, valueMin + MIN_GAP)
    setMaxText(String(final))
    setMaxErr("")
    onChange(valueMin, final)
  }, [valueMin, valueMax, min, max, step, MIN_GAP, onChange, clamp])

  const handleMinInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingMin.current = true
    const raw = e.target.value
    setMinText(raw)
    // Validate while typing
    if (raw.trim() !== "" && isNaN(Number(raw))) {
      setMinErr("Only numbers allowed")
    } else {
      setMinErr("")
    }
  }, [])

  const handleMaxInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingMax.current = true
    const raw = e.target.value
    setMaxText(raw)
    if (raw.trim() !== "" && isNaN(Number(raw))) {
      setMaxErr("Only numbers allowed")
    } else {
      setMaxErr("")
    }
  }, [])

  // Slider change handlers
  const handleSliderMin = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), valueMax - MIN_GAP)
    setMinText(String(v))
    setMinErr("")
    onChange(v, valueMax)
  }, [valueMax, MIN_GAP, onChange])

  const handleSliderMax = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), valueMin + MIN_GAP)
    setMaxText(String(v))
    setMaxErr("")
    onChange(valueMin, v)
  }, [valueMin, MIN_GAP, onChange])

  const pct = (v: number) => ((v - min) / (max - min)) * 100
  const minPct = pct(valueMin)
  const maxPct = pct(valueMax)

  const inputFieldClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-center text-base font-semibold " +
    "text-foreground outline-none transition placeholder:text-muted " +
    "focus:border-emerald-500/50"

  return (
    <>
      <style>{`
        .rs-track { position: relative; height: 1.5rem; margin: 0 0.25rem; }
        .rs-bg { position: absolute; inset: 0.375rem 0; height: 0.375rem; border-radius: 999px; background: var(--border); }
        .rs-fill { position: absolute; top: 0.375rem; height: 0.375rem; border-radius: 999px; background: color-mix(in srgb, var(--accent) 40%, transparent); }
        .rs-input {
          position: absolute; inset: 0; width: 100%; height: 100%;
          -webkit-appearance: none; appearance: none;
          background: transparent; pointer-events: none; cursor: pointer; margin: 0;
        }
        .rs-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; pointer-events: auto;
          height: 1.25rem; width: 1.25rem; border-radius: 999px;
          border: 2px solid var(--accent); background: var(--background);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);
          transition: transform 0.1s; cursor: grab;
        }
        .rs-input::-webkit-slider-thumb:active { transform: scale(1.15); cursor: grabbing; }
        .rs-input::-moz-range-thumb {
          pointer-events: auto; height: 1.25rem; width: 1.25rem; border-radius: 999px;
          border: 2px solid var(--accent); background: var(--background);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);
          transition: transform 0.1s; cursor: grab;
        }
        .rs-input::-moz-range-thumb:active { transform: scale(1.15); cursor: grabbing; }
        .rs-input::-ms-thumb {
          pointer-events: auto; height: 1.25rem; width: 1.25rem; border-radius: 999px;
          border: 2px solid var(--accent); background: var(--background); cursor: grab;
        }
        .rs-input::-webkit-slider-runnable-track { -webkit-appearance: none; appearance: none; height: 100%; background: transparent; }
        .rs-input::-moz-range-track { -webkit-appearance: none; appearance: none; height: 100%; background: transparent; }
      `}</style>

      <div className="pt-6 pb-3">
        {/* Editable input fields */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="mb-1 text-center text-[10px] uppercase tracking-wider text-muted">Min</div>
            <input
              type="text"
              inputMode="numeric"
              value={minText}
              onChange={handleMinInput}
              onBlur={() => commitMin(minText)}
              onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder={formatLabel ? formatLabel(min) : String(min)}
              className={`${inputFieldClass} ${minErr ? "border-red-500/50" : "border-border"}`}
              aria-label="Minimum budget"
            />
            {minErr && <p className="mt-1 text-center text-[11px] text-red-400">{minErr}</p>}
          </div>
          <div className="mt-5 text-xs text-muted">—</div>
          <div className="flex-1">
            <div className="mb-1 text-center text-[10px] uppercase tracking-wider text-muted">Max</div>
            <input
              type="text"
              inputMode="numeric"
              value={maxText}
              onChange={handleMaxInput}
              onBlur={() => commitMax(maxText)}
              onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder={formatLabel ? formatLabel(max) : String(max)}
              className={`${inputFieldClass} ${maxErr ? "border-red-500/50" : "border-border"}`}
              aria-label="Maximum budget"
            />
            {maxErr && <p className="mt-1 text-center text-[11px] text-red-400">{maxErr}</p>}
          </div>
        </div>

        {/* Slider track */}
        <div className="rs-track">
          <div className="rs-bg" />
          <div className="rs-fill" style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }} />

          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={valueMin}
            onChange={handleSliderMin}
            className="rs-input"
            style={{ zIndex: 10 }}
            aria-label="Minimum price"
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={valueMax}
            onChange={handleSliderMax}
            className="rs-input"
            style={{ zIndex: 20 }}
            aria-label="Maximum price"
          />
        </div>

        {/* Endpoints */}
        <div className="mt-1 flex justify-between px-0.5 text-[10px] text-muted">
          <span>{formatLabel ? formatLabel(min) : min}</span>
          <span>{formatLabel ? formatLabel(max) : max}</span>
        </div>
      </div>
    </>
  )
}
