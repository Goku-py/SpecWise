"use client"

import { Laptop, Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"
import type { ThemeChoice } from "./theme"
import { cn } from "@/lib/utils"

const OPTIONS: readonly { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Laptop },
  { value: "dark", label: "Dark", Icon: Moon },
]

/**
 * Compact appearance control: Light / Dark / System segmented group.
 * Radiogroup semantics (arrow-key + screen-reader friendly); icon-sized so
 * it never dominates the header. Rendered in the header (desktop) and
 * inside the mobile menu.
 */
export function AppearanceSwitcher({ className }: { className?: string }) {
  const { choice, setChoice } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setChoice(value)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              active
                ? "bg-secondary-soft text-foreground"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
