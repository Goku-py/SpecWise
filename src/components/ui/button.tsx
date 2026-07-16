import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const variants = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500",
  secondary: "bg-card text-foreground hover:bg-card-hover focus-visible:ring-zinc-500",
  outline: "border border-border text-muted hover:bg-card-hover focus-visible:ring-zinc-500",
  ghost: "text-muted hover:text-foreground hover:bg-card-hover focus-visible:ring-zinc-500",
  danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500",
}

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
