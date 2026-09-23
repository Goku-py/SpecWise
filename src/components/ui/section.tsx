import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionProps {
  id?: string
  eyebrow?: string
  title?: string
  lede?: string
  children: ReactNode
  className?: string
}

/**
 * Landing section shell: consistent py-16 lg:py-24 rhythm inside a
 * max-w-7xl container. Heading block wires aria-labelledby when a title
 * is provided; callers pass a custom labelledby via `labelledBy` when
 * they render their own heading.
 */
export function Section({ id, eyebrow, title, lede, children, className }: SectionProps) {
  const titleId = id ? `${id}-title` : undefined
  return (
    <section id={id} aria-labelledby={title ? titleId : undefined} className={cn("py-16 lg:py-24", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || title || lede) && (
          <div className="mb-10 max-w-2xl">
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            {title && (
              <h2 id={titleId} className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h2>
            )}
            {lede && <p className="lede mt-3">{lede}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
