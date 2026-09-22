"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CURRENCIES, cn } from "@/lib/utils"
import { REGIONS, type RegionConfig } from "@/lib/regions"
import { useClientRegion, setClientRegion } from "@/lib/region-store"

/**
 * Region selector. The displayed region comes from the client region store
 * (server-rendered value until hydration, live value afterwards), so desktop
 * and mobile instances stay in sync and every price on the page updates the
 * moment a region is picked.
 *
 * Geo-detection is handled server-side by src/middleware.ts (x-vercel-ip-country
 * header) — the old client-side ipapi.co fetch was blocked by the CSP and
 * silently fell back to US on every device that had no cookie.
 */
export function RegionPicker({
  currentRegion,
  placement = "bottom",
}: {
  currentRegion: RegionConfig
  placement?: "top" | "bottom"
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pre-hydration: server prop. Post-hydration: live store value (cookie).
  const selected = useClientRegion(currentRegion)
  const currency = CURRENCIES.find(c => (c.countries as readonly string[]).includes(selected.code))

  function select(code: string) {
    setOpen(false)
    // Optimistic: every subscriber (pickers, detail pricing) re-renders now.
    void setClientRegion(code)
    // Server-rendered region data (catalog grid, quiz, results) catches up.
    router.refresh()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault()
      setOpen(true)
      setFocusedIndex(e.key === "ArrowDown" ? 0 : REGIONS.length - 1)
      return
    }
    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault()
      setFocusedIndex(prev =>
        e.key === "ArrowDown"
          ? prev < REGIONS.length - 1 ? prev + 1 : 0
          : prev > 0 ? prev - 1 : REGIONS.length - 1
      )
    }
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // delay attaching so the toggle click itself doesn't trigger close
    const id = requestAnimationFrame(() => document.addEventListener("click", handler))
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener("click", handler)
    }
  }, [open])

  useEffect(() => {
    if (!open || focusedIndex < 0) return
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-index="${focusedIndex}"]`)
    el?.focus()
  }, [open, focusedIndex])

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => { setOpen(!open); setFocusedIndex(-1) }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select region"
        className="flex min-h-10 items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-muted transition hover:bg-card hover:text-foreground"
      >
        <span aria-hidden="true">{selected.flag}</span>
        <span className="font-mono text-xs">{selected.code}</span>
        {currency && <span className="text-muted text-xs">({currency.symbol})</span>}
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Available regions"
          className={cn(
            "absolute right-0 z-50 w-48 rounded border border-border bg-card p-1 shadow-xl",
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          {REGIONS.map((r, i) => (
            <button
              key={r.code}
              role="option"
              aria-selected={selected.code === r.code}
              tabIndex={-1}
              data-index={i}
              onClick={() => select(r.code)}
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm transition ${
                selected.code === r.code
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-card-hover hover:text-foreground"
              }`}
            >
              <span aria-hidden="true">{r.flag}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
