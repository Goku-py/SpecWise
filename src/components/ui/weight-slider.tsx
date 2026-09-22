"use client"

import { cn } from "@/lib/utils"

interface WeightSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function WeightSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  className,
}: WeightSliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-mono text-xs text-foreground">{value.toFixed(2)}</span>
      </div>
      <div className="relative h-1.5 rounded bg-border">
        <div
          className="absolute h-full rounded bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </div>
    </div>
  )
}
