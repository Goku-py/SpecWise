"use client"

import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Inline script injected into <head> to prevent flash of wrong theme */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var t = localStorage.getItem("specwise-theme");
            if (!t) { t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
            document.documentElement.classList.toggle("dark", t === "dark");
          } catch(e) {}
        `,
      }}
    />
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    try { localStorage.setItem("specwise-theme", next ? "dark" : "light") } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "rounded-lg p-2 text-muted transition hover:bg-card-hover hover:text-foreground",
        className
      )}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
