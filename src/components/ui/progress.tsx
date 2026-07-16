import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className={cn("h-2 w-full rounded-full bg-border", className)}>
      <div
        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function MatchBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : score >= 70 ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : score >= 50 ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : "bg-muted/20 text-muted border-muted/30"

  const label =
    score >= 90 ? "Excellent"
    : score >= 75 ? "Great"
    : score >= 60 ? "Good"
    : score >= 40 ? "Decent"
    : "Basic"

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", color)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} match • {score}%
    </span>
  )
}
