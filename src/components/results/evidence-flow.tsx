"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface EvidenceFlowProps {
  animated?: boolean
}

const leftNodes = [
  "TRADITIONAL REVIEW",
  "SPONSORSHIP DEAL",
  "AFFILIATE COMMISSION",
  "RANKING (PAID)",
]

const rightNodes = [
  "SPECWISE ENGINE",
  "RAW HARDWARE DATA",
  "THERMAL CONSTRAINTS",
  "BENCHMARK WEIGHTS",
  "USER PROFILE",
  "F-SCORE RANKING",
]

function Pipeline({ nodes, tint, animated }: { nodes: string[]; tint: "danger" | "success"; animated: boolean }) {
  const [visibleState, setVisible] = useState(false)
  const prefersReduced = useReducedMotion()
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animated || prefersReduced) return
    const el = elRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [tint, animated, prefersReduced])

  // When not animating, treat as visible without state (setState only happens
  // in the observer callback of the animated path).
  const visible = animated ? visibleState : true

  const colorMap = {
    danger: "border-accent-danger/20 bg-accent-danger/5",
    success: "border-accent-success/20 bg-accent-success/5",
  }

  return (
    <div ref={elRef} className="flex flex-col items-center gap-1">
      {nodes.map((label, i) => (
        <div key={label} className="flex flex-col items-center">
          {i > 0 && (
            <span className="text-accent text-xs font-mono py-0.5 select-none">
              &#8595;
            </span>
          )}
          <div
            className={`border ${colorMap[tint]} bg-card px-4 py-2 rounded text-xs font-mono ${
              visible && animated && !prefersReduced ? "animate-fade-in opacity-0" : ""
            }`}
            style={visible && animated && !prefersReduced ? { animationDelay: `${i * 200}ms` } : undefined}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EvidenceFlow({ animated = true }: EvidenceFlowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
      <Pipeline nodes={leftNodes} tint="danger" animated={animated} />
      <Pipeline nodes={rightNodes} tint="success" animated={animated} />
    </div>
  )
}
