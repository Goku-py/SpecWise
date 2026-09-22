"use client"

import { useSyncExternalStore } from "react"

/**
 * Detects `prefers-reduced-motion: reduce` via matchMedia.
 * Returns `false` by default (SSR-safe: renders as animated; the
 * server snapshot is `false` and the store corrects on the client).
 */
export function useReducedMotion(): boolean {
  const subscribe = (onStoreChange: () => void) => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    mq.addEventListener("change", onStoreChange)
    return () => mq.removeEventListener("change", onStoreChange)
  }

  const getSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}