import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className={cn("h-1.5 w-full rounded bg-border", className)}>
      <div
        className="h-full rounded bg-accent transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function MatchBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? "bg-accent-success/15 text-accent-success border border-accent-success/30"
    : score >= 70 ? "bg-accent-warning/15 text-accent-warning border border-accent-warning/30"
    : "bg-muted/15 text-muted border border-border"

  const label =
    score >= 90 ? "Excellent"
    : score >= 75 ? "Great"
    : score >= 60 ? "Good"
    : score >= 40 ? "Decent"
    : "Basic"

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium font-mono", color)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} match &bull; {score}%
    </span>
  )
}
