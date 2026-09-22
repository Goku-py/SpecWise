"use client"

import { memo } from "react"
import Link from "next/link"
import { Cpu, MemoryStick, HardDrive, Monitor, ChevronRight } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { ProductImage } from "@/components/ui/product-image"
import type { CatalogLaptop } from "@/lib/types"

export const LaptopCard = memo(function LaptopCard({ laptop, priority }: { laptop: CatalogLaptop; priority?: boolean }) {
  // Phase 2a: prefer the slug URL; legacy ids contain spaces and must be encoded.
  const href = laptop.slug
    ? `/laptops/${laptop.slug}`
    : `/laptops/${encodeURIComponent(laptop.id)}`
  return (
    <Link
      href={href}
      className="group animate-fade-in block rounded border border-border bg-card p-5 transition-all hover:border-accent/20 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Image */}
      <div className="mb-4 flex h-32 items-center justify-center rounded border border-border bg-background">
        <ProductImage
          src={laptop.imageUrl}
          alt={`${laptop.brand} ${laptop.model}`}
          width={200}
          height={112}
          priority={priority}
          className="max-h-28 object-contain transition-transform group-hover:scale-105"
        />
      </div>

      {/* Brand + Model */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {laptop.brand} {laptop.model}
            {laptop.variant && <span className="text-muted"> ({laptop.variant})</span>}
          </h3>
          {laptop.isPopular && (
            <span className="shrink-0 rounded border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              Popular
            </span>
          )}
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-muted">{laptop.os}</p>
      </div>

      {/* Key Specs */}
      <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[10px] text-muted">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{laptop.cpuBrand} {laptop.cpuFamily}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MemoryStick className="h-3.5 w-3.5 shrink-0" />
          <span>{laptop.ramAmount} GB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 shrink-0" />
          <span>{laptop.storageAmount} GB {laptop.storageType}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Monitor className="h-3.5 w-3.5 shrink-0" />
          <span>{laptop.displaySize}{'"'}{laptop.displayResolution ? ` ${laptop.displayResolution}` : ""}</span>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div>
          {laptop.price != null ? (
            <span className="font-mono text-sm font-bold text-foreground">{formatPrice(laptop.price, laptop.currency)}</span>
          ) : (
            <span className="text-xs text-muted">Price unavailable</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  )
})

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded border border-border bg-card p-5">
      <div className="mb-4 h-32 rounded bg-card-hover" />
      <div className="mb-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-card-hover" />
        <div className="h-3 w-1/2 rounded bg-card-hover" />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 w-full rounded bg-card-hover" />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="h-5 w-20 rounded bg-card-hover" />
        <div className="h-4 w-4 rounded bg-card-hover" />
      </div>
    </div>
  )
}
