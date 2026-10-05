"use client"

import { useState, type KeyboardEvent } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { productImageAlt, resolveProductImage } from "@/lib/product-image"
import { ProductImageFallback } from "@/components/ui/product-image"

export interface GalleryImage {
  src: string
  /** Truthful caption only — never invent view names ("front", "side"). Omit when unknown. */
  label?: string
}

/**
 * Detail gallery (Phase 8). Single-image reality today: one primary frame +
 * an honest fallback slot when the row has no valid image — no fake
 * multi-views, no lightbox. Thumbnails, keyboard nav, and the live
 * "current of count" announcement activate only when >1 valid image exists.
 * Primary reserves its aspect box (no CLS); only the primary is ever priority.
 */
export function DetailGallery({
  images,
  brand,
  model,
  priority,
  sizes = "(max-width: 640px) 90vw, 400px",
}: {
  images: GalleryImage[]
  brand: string
  model: string
  priority?: boolean
  sizes?: string
}) {
  // Defensive: the resolver drops legacy non-allowlisted/malformed rows, so
  // the gallery can never mount a URL next/image would reject.
  const valid = images.filter(i => resolveProductImage(i.src).kind === "image")
  const [selected, setSelected] = useState(0)
  const current = valid[Math.min(selected, Math.max(valid.length - 1, 0))]
  const alt = productImageAlt(brand, model)

  function onStripKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (valid.length < 2) return
    let next: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (selected + 1) % valid.length
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (selected - 1 + valid.length) % valid.length
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = valid.length - 1
    if (next == null) return
    e.preventDefault()
    setSelected(next)
    // Move focus with selection so keyboard + screen-reader users stay in sync.
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-thumb]")
    buttons[next]?.focus()
  }

  if (!current) {
    return (
      <div className="mb-8 flex items-center justify-center rounded border border-border bg-card p-8">
        <ProductImageFallback alt={alt} width={400} height={256} className="max-h-64" />
      </div>
    )
  }

  const position = `Image ${Math.min(selected, valid.length - 1) + 1} of ${valid.length}`

  return (
    <div className="mb-8 rounded border border-border bg-card p-4 sm:p-8">
      <div className="flex items-center justify-center">
        <Image
          key={current.src}
          src={current.src}
          alt={current.label ? `${alt} — ${current.label}` : alt}
          width={800}
          height={512}
          priority={priority}
          sizes={sizes}
          className="h-auto max-h-80 w-auto max-w-full object-contain"
        />
      </div>
      {valid.length > 1 ? (
        <>
          <p aria-hidden className="mt-3 text-center font-mono text-[10px] text-muted">
            {position}
            {current.label ? ` · ${current.label}` : ""}
          </p>
          <div
            role="group"
            aria-label={`Product images: ${position}`}
            onKeyDown={onStripKeyDown}
            className="mt-2 flex items-center justify-center gap-2"
          >
            {valid.map((img, i) => (
              <button
                key={img.src}
                type="button"
                data-thumb
                onClick={() => setSelected(i)}
                aria-current={i === selected}
                aria-label={`Show ${`image ${i + 1} of ${valid.length}`}${img.label ? `: ${img.label}` : ""}`}
                className={cn(
                  "overflow-hidden rounded border bg-background/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  i === selected ? "border-accent ring-1 ring-accent" : "border-border"
                )}
              >
                <Image
                  src={img.src}
                  alt=""
                  aria-hidden
                  width={96}
                  height={64}
                  loading="lazy"
                  sizes="96px"
                  className="h-12 w-[72px] object-contain"
                />
              </button>
            ))}
          </div>
          <p aria-live="polite" role="status" className="sr-only">
            {position}
            {current.label ? `: ${current.label}` : ""} selected
          </p>
        </>
      ) : null}
    </div>
  )
}
