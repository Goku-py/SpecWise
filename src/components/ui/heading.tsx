import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface H2Props extends HTMLAttributes<HTMLHeadingElement> {}

/** Small H2 helper for landing sections that render custom headers. */
export function H2({ className, ...props }: H2Props) {
  return (
    <h2
      className={cn("text-2xl font-bold tracking-tight text-foreground sm:text-3xl", className)}
      {...props}
    />
  )
}
