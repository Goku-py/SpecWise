import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded font-medium transition-all duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50"

const variants = {
  primary: "bg-accent text-background hover:bg-accent-hover focus-visible:ring-ring font-semibold",
  secondary: "bg-secondary text-foreground hover:bg-card-hover focus-visible:ring-ring border border-border",
  outline: "border border-border-strong text-foreground hover:bg-card-hover focus-visible:ring-ring",
  ghost: "text-muted hover:text-foreground hover:bg-card-hover focus-visible:ring-ring",
  danger: "bg-accent-danger text-background hover:opacity-90 focus-visible:ring-accent-danger",
}

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
}

/**
 * Shared class builder so <Link>/<a> elements can be styled exactly like a
 * Button without nesting an interactive element inside another.
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  className?: string
} = {}) {
  return cn(buttonBase, variants[variant], sizes[size], className)
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
