import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "accent" | "success" | "outline"

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-border bg-card text-muted",
  accent: "border-accent/30 bg-accent/10 text-accent",
  success: "border-accent-success/30 bg-accent-success/10 text-accent-success",
  outline: "border-border-strong bg-transparent text-foreground",
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

/** Tiny mono uppercase badge. Non-interactive; no touch target needed. */
export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[1.75rem] items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}
