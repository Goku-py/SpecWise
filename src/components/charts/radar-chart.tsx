"use client"

import { useState, useMemo } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

export interface RadarChartProps {
  dims: { label: string; value: number }[]
  size?: number
  accent?: string
}

const AXIS_COUNT = 8

function polar(angle: number, r: number, cx: number, cy: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function ringPoints(angles: number[], r: number, cx: number, cy: number) {
  return angles.map((a) => { const p = polar(a, r, cx, cy); return `${p.x},${p.y}` }).join(" ")
}

export function RadarChart({ dims, size = 320, accent = "var(--accent)" }: RadarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()
  const cx = size / 2, cy = size / 2, maxR = (size - 60) / 2
  const angles = useMemo(() => Array.from({ length: AXIS_COUNT }, (_, i) => (360 / AXIS_COUNT) * i), [])

  const polyPoints = dims.map((d, i) => {
    const p = polar(angles[i], maxR * Math.min(1, Math.max(0, d.value)), cx, cy)
    return `${p.x},${p.y}`
  }).join(" ")

  return (
    <div className="relative inline-block" role="img" aria-label="Radar chart showing dimension scores">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map((r) => (
          <polygon key={r} points={ringPoints(angles, maxR * r, cx, cy)} fill="none" stroke="var(--border)" strokeWidth={0.5} />
        ))}
        {/* Axes */}
        {angles.map((a, i) => {
          const end = polar(a, maxR, cx, cy)
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={hoverIdx === i ? accent : "var(--border)"} strokeWidth={hoverIdx === i ? 1.5 : 0.5} style={{ transition: reducedMotion ? undefined : "stroke 0.15s, stroke-width 0.15s" }} />
        })}
        {/* Polygon */}
        <polygon points={polyPoints} fill={accent} fillOpacity={0.18} stroke={accent} strokeWidth={1.5} strokeLinejoin="round" />
        {/* Vertices + labels */}
        {dims.map((d, i) => {
          const val = Math.min(1, Math.max(0, d.value))
          const p = polar(angles[i], maxR * val, cx, cy)
          const lp = polar(angles[i], maxR + 18, cx, cy)
          const h = hoverIdx === i
          const enter = () => setHoverIdx(i)
          const leave = () => setHoverIdx(null)
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={h ? 4.5 : 3} fill={accent} stroke="var(--background)" strokeWidth={1.5} style={{ transition: reducedMotion ? undefined : "r 0.15s" }} onMouseEnter={enter} onMouseLeave={leave} />
              <circle cx={p.x} cy={p.y} r={12} fill="transparent" onMouseEnter={enter} onMouseLeave={leave} />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px]" fill={h ? accent : "var(--muted)"} style={{ transition: reducedMotion ? undefined : "fill 0.15s" }}>{d.label}</text>
            </g>
          )
        })}
        {/* Tooltip */}
        {hoverIdx !== null && dims[hoverIdx] && (() => {
          const v = Math.min(1, Math.max(0, dims[hoverIdx].value))
          const tp = polar(angles[hoverIdx], maxR * v, cx, cy)
          return (
            <g>
              <rect x={tp.x - 34} y={tp.y - 22} width={68} height={18} rx={3} fill="var(--background)" stroke={accent} strokeWidth={0.75} />
              <text x={tp.x} y={tp.y - 12} textAnchor="middle" dominantBaseline="central" className="font-mono text-[9px]" fill={accent}>{(v * 100).toFixed(0)}%</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
