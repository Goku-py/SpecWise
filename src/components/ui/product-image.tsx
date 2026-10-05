"use client"

import { useState } from "react"
import Image from "next/image"
import { Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import { productImageAlt, resolveProductImage } from "@/lib/product-image"

/**
 * Deliberate SpecWise "Image unavailable" frame (Phase 8): neutral Monitor
 * idiom + product name + short honest caption, same aspect box as the real
 * image (no collapse, no CLS), readable in Light/Dark/System via theme
 * tokens. Dashed border marks it as a placeholder slot, not a broken image.
 * The icon + visible text are decorative/duplicative (aria-hidden); the frame
 * itself carries role="img" + label so assistive tech hears "unavailable"
 * once instead of silence or double announcement.
 */
export function ProductImageFallback({
  alt,
  width,
  height,
  className,
}: {
  alt: string
  width: number
  height: number
  className?: string
}) {
  // Compact tiles (e.g. option-card thumbs) get the icon only — the
  // role="img" label still announces "unavailable" to assistive tech.
  const compact = width < 120 || height < 80
  return (
    <div
      role="img"
      aria-label={`Image unavailable for ${alt}`}
      style={{ aspectRatio: `${width} / ${height}`, width: `min(100%, ${width}px)` }}
      className={cn(
        "flex shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed border-border bg-card text-center text-muted",
        compact ? "p-1" : "p-2",
        className
      )}
    >
      <Monitor aria-hidden className={compact ? "h-5 w-5 shrink-0" : "h-6 w-6 shrink-0"} />
      {!compact && (
        <span aria-hidden="true" className="flex max-w-full flex-col items-center gap-0.5 px-2">
          <span className="line-clamp-1 max-w-full text-[11px] font-semibold text-foreground">{alt}</span>
          <span className="line-clamp-2 font-mono text-[10px] leading-tight">Image unavailable</span>
        </span>
      )}
    </div>
  )
}

export function ProductImage({
  src,
  alt,
  width,
  height,
  className,
  priority,
  loading,
  sizes,
}: {
  src: string | null
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  loading?: "lazy" | "eager"
  sizes?: string
}) {
  // Error latch keyed by src: a failed URL stays fallback, but a NEW url
  // retries automatically (no effect needed — comparison, not setState).
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const error = failedSrc !== null && failedSrc === src

  // Shared resolver: allowlisted https image or deliberate fallback — legacy
  // non-Unsplash/malformed rows degrade here instead of crashing next/image.
  const resolved = error ? { kind: "fallback" as const } : resolveProductImage(src)
  if (resolved.kind === "fallback") {
    return <ProductImageFallback alt={alt} width={width} height={height} className={className} />
  }

  return (
    <Image
      src={resolved.src}
      alt={alt}
      width={width}
      height={height}
      className={cn("h-auto w-auto shrink-0", className)}
      onError={() => setFailedSrc(src)}
      priority={priority}
      loading={loading}
      sizes={sizes}
    />
  )
}

/** Factual alt-text helper for call sites: "{brand} {model}". */
export { productImageAlt }
