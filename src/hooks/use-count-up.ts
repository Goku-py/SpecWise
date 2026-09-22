"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Monotonic rAF count-up from 0 → target. Under prefers-reduced-motion,
 * returns the target instantly (no animation).
 */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0)
  const prefersReduced = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    prefersReduced.current = mq.matches
  }, [])

  useEffect(() => {
    if (prefersReduced.current || target <= 0) {
      setValue(target)
      return
    }

    let raf: number
    let start: number | null = null

    function tick(now: number) {
      if (start === null) start = now
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
