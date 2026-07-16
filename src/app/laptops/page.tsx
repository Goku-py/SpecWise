"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRegion } from "@/components/region-context"
import Link from "next/link"
import { Search, Cpu, MemoryStick, HardDrive, Monitor, Loader2, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils"
import { ProductImage } from "@/components/ui/product-image"

interface LaptopResult {
  id: string
  brand: string
  model: string
  variant: string | null
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuCores: number | null
  gpuType: string
  gpuModel: string | null
  ramAmount: number
  storageAmount: number
  storageType: string
  displaySize: number
  displayResolution: string | null
  displayRefreshRate: number
  weight: number | null
  batteryLife: number | null
  imageUrl: string | null
  reviewScore: number | null
  isPopular: boolean
  price: number | null
  currency: string
}

function LaptopCard({ laptop }: { laptop: LaptopResult }) {
  return (
    <Link
      href={`/laptops/${laptop.id}`}
      className="group animate-fade-in block rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/30 hover:bg-card-hover hover:shadow-sm"
    >
      {/* Image */}
      <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-background/50">
        <ProductImage
          src={laptop.imageUrl}
          alt={`${laptop.brand} ${laptop.model}`}
          width={200}
          height={112}
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
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
              Popular
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">{laptop.os}</p>
      </div>

      {/* Key Specs */}
      <div className="mb-3 grid grid-cols-2 gap-1.5 text-xs text-muted">
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
          <span>{laptop.displaySize}"{laptop.displayResolution ? ` ${laptop.displayResolution}` : ""}</span>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div>
          {laptop.price != null ? (
            <span className="text-base font-bold text-foreground">
              {formatPrice(laptop.price, laptop.currency)}
            </span>
          ) : (
            <span className="text-xs text-muted">Price unavailable</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5">
      <div className="mb-4 h-32 rounded-lg bg-card-hover" />
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

export default function LaptopsPage() {
  const { region } = useRegion()
  const [query, setQuery] = useState("")
  const [laptops, setLaptops] = useState<LaptopResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string, regionCode: string) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (regionCode) params.set("region", regionCode)
      const res = await fetch(`/api/laptops/search?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLaptops(data.laptops ?? [])
    } catch {
      setLaptops([])
      setError("Failed to load laptops. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch all laptops on mount and when region changes
  useEffect(() => {
    search("", region.code)
  }, [region.code]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query, region.code), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, region.code]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Browse Laptops</h1>
        <p className="mt-1 text-sm text-muted">
          Search by brand or model to find detailed specs and pricing.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by brand or model…"
          autoFocus
          className={cn(
            "w-full rounded-xl border border-border bg-background py-3.5 pl-12 pr-4 text-sm text-foreground",
            "placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30",
            "transition-colors"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : laptops.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Monitor className="mb-4 h-12 w-12 text-muted" />
          <h3 className="text-lg font-semibold text-foreground">
            {error ? "Something went wrong" : "No laptops found"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {error || (query
              ? `No results for "${query}". Try a different search term.`
              : "No laptops in the catalog yet.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {laptops.map(laptop => (
            <LaptopCard key={laptop.id} laptop={laptop} />
          ))}
        </div>
      )}
    </div>
  )
}
