"use client"

import { useState, useEffect, useRef } from "react"
import { CURRENCIES } from "@/lib/utils"
import { REGIONS } from "@/lib/regions"
import { useRegion } from "../region-context"

export function RegionPicker() {
  const { region, setRegion } = useRegion()
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = REGIONS.find(r => r.code === region.code) || REGIONS[0]
  const currency = CURRENCIES.find(c => (c.countries as readonly string[]).includes(region.code))

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

  const containerRef = useRef<HTMLDivElement>(null)

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
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-card hover:text-foreground"
      >
        <span>{selected.flag}</span>
        <span>{selected.code}</span>
        {currency && <span className="text-muted">({currency.symbol})</span>}
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Available regions"
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          {REGIONS.map((r, i) => (
            <button
              key={r.code}
              role="option"
              aria-selected={region.code === r.code}
              tabIndex={-1}
              data-index={i}
              onClick={() => {
                setRegion(r.code)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                region.code === r.code
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-card-hover hover:text-foreground"
              }`}
            >
              <span>{r.flag}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
