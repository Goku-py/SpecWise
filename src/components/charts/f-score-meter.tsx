"use client"

import { useCountUp } from "@/hooks/use-count-up"

export interface FScoreMeterProps {
  score: number
  label?: string
  size?: number
  animate?: boolean
}

export function FScoreMeter({ score, label = "F-SCORE", size = 132, animate = true }: FScoreMeterProps) {
  const clamped = Math.min(100, Math.max(0, score))
  const counted = useCountUp(animate ? clamped : 0, 700)
  const displayed = animate ? counted : clamped

  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (clamped / 100) * circ
  const color = clamped >= 80 ? "var(--accent-success)" : clamped >= 60 ? "var(--accent-warning)" : "var(--accent-danger)"
  const cx = size / 2, cy = size / 2

  return (
    <div className="inline-flex flex-col items-center gap-1" role="img" aria-label={`${label}: ${clamped}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: animate ? "stroke-dashoffset 0.7s cubic-bezier(0.2,0,0,1)" : undefined }} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill={color} className="font-mono text-[28px] font-bold">{displayed}</text>
      </svg>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
    </div>
  )
}
