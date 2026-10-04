"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react"
import {
  THEME_STORAGE_KEY,
  parseStoredTheme,
  resolveEffectiveTheme,
  type EffectiveTheme,
  type ThemeChoice,
} from "./theme"

interface ThemeContextValue {
  choice: ThemeChoice
  effective: EffectiveTheme
  setChoice: (c: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): ThemeChoice {
  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return "system"
  }
}

function writeStored(choice: ThemeChoice): void {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY)
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch {
    // Quota / private-mode failures must never break the UI.
  }
}

function applyEffective(effective: EffectiveTheme): void {
  const root = document.documentElement
  if (effective === "light") root.setAttribute("data-theme", "light")
  else root.removeAttribute("data-theme")
}

// Same-tab writes don't fire "storage" events, so the provider notifies
// its own subscribers after every explicit choice.
const storedListeners = new Set<() => void>()
function notifyStored(): void {
  storedListeners.forEach((l) => l())
}

function subscribeStored(onChange: () => void): () => void {
  storedListeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    storedListeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

/** Stored choice, external-store style (same pattern as use-reduced-motion). */
function useStoredTheme(): ThemeChoice {
  return useSyncExternalStore(subscribeStored, readStored, () => "system" as ThemeChoice)
}

function subscribeSystemDark(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

function readSystemDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  } catch {
    return false
  }
}

/** OS preference, external-store style (SSR-safe: renders as not-dark). */
function useSystemDark(): boolean {
  return useSyncExternalStore(subscribeSystemDark, readSystemDark, () => false)
}

/** Tiny provider: derives the effective theme, mirrors it to <html> + storage. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const choice = useStoredTheme()
  const systemDark = useSystemDark()
  const effective: EffectiveTheme = resolveEffectiveTheme(choice, systemDark)

  // DOM-only sync: no setState, no cascading renders.
  useEffect(() => {
    applyEffective(effective)
  }, [effective])

  const setChoice = useCallback((c: ThemeChoice) => {
    writeStored(c)
    notifyStored()
  }, [])

  const value = useMemo(() => ({ choice, effective, setChoice }), [choice, effective, setChoice])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
