"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Search, Monitor, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { LaptopCard, SkeletonCard } from "./laptop-card"
import type { CatalogLaptop } from "@/lib/types"
import type { RegionConfig } from "@/lib/regions"

export function CatalogView({
  initialLaptops,
  initialRegion,
  initialQuery,
}: {
  initialLaptops: CatalogLaptop[]
  initialRegion: RegionConfig
  initialQuery: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [laptops, setLaptops] = useState<CatalogLaptop[]>(initialLaptops)
  const [loading, setLoading] = useState(initialQuery.length > 0)
  const [error, setError] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // The server already rendered the full catalog, so skip the first debounced
  // fetch (unless a ?q= search param asked for a filtered view).
  const skipInitialSearch = useRef(initialQuery.length === 0)

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const search = useCallback(async (q: string, regionCode: string) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (regionCode) params.set("region", regionCode)
      const res = await fetch(`/api/laptops/search?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { laptops?: CatalogLaptop[] }
      setLaptops(data.laptops ?? [])
    } catch {
      setLaptops([])
      setError("Failed to load laptops. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search on query change; also refetches when the region cookie
  // changes (the server shell passes a new initialRegion prop).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (skipInitialSearch.current) {
      skipInitialSearch.current = false
      return
    }
    debounceRef.current = setTimeout(() => search(query, initialRegion.code), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, initialRegion.code, search])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-muted">
        <Link
          href="/"
          className="inline-flex items-center rounded p-3.5 -m-3.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Catalog</span>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Browse Laptops</h1>
        <p className="mt-1 text-sm text-muted">
          {initialRegion.flag} Explore laptops available in{" "}
          <span className="font-medium text-foreground">{initialRegion.label}</span> — search by brand or model to find
          detailed specs and pricing.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by brand or model…"
          autoFocus
          className={cn(
            "w-full rounded-xl border border-border bg-background py-3.5 pl-12 pr-20 text-sm text-foreground",
            "placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30",
            "transition-colors"
          )}
        />
        {!query && !loading && (
          <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-card-hover px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </div>

      {/* Stats line */}
      {!loading && (
        <p className="mb-4 text-xs text-muted">
          {laptops.length === 1 ? "1 laptop found" : `${laptops.length} laptops found`}
        </p>
      )}

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
            {error
              ? "Failed to load laptops. Check your connection and try again."
              : query
                ? `No results for "${query}". Try a different search term.`
                : "No laptops in the catalog yet."}
          </p>
          {error && (
            <button
              onClick={() => search(query, initialRegion.code)}
              className="mt-4 rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {laptops.map((laptop, i) => (
            <LaptopCard key={laptop.id} laptop={laptop} priority={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
