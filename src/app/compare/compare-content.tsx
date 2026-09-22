"use client"

import { useMemo, useSyncExternalStore, type KeyboardEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, X as XIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { BuyButton } from "@/components/product/buy-button"
import { MatchBadge } from "@/components/ui/progress"
import { formatPrice } from "@/lib/utils"
import { readResultsSnapshot } from "@/lib/storage"
import type { RecommendedLaptop } from "@/lib/types"

// Arrow keys scroll the horizontally scrollable table region so keyboard-only
// users can reach off-screen columns (WCAG 2.1.1).
function handleTableScrollKeyDown(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
  e.preventDefault()
  e.currentTarget.scrollBy({ left: e.key === "ArrowLeft" ? -120 : 120 })
}

type RowDef = { label: string; getValue: (l: RecommendedLaptop) => string | boolean }

const rows: RowDef[] = [
  { label: "Price", getValue: l => formatPrice(l.price, l.currency) },
  { label: "OS", getValue: l => l.os },
  { label: "CPU", getValue: l => `${l.cpuBrand} ${l.cpuFamily}${l.cpuGeneration ? ` (${l.cpuGeneration})` : ""}` },
  { label: "CPU Cores", getValue: l => (l.cpuCores ? `${l.cpuCores} cores` : "—") },
  { label: "GPU", getValue: l => l.gpuModel || l.gpuType },
  {
    label: "RAM",
    getValue: l => `${l.ramAmount} GB${l.ramUpgradeable ? " (upgradeable)" : " (soldered)"}`,
  },
  {
    label: "Storage",
    getValue: l =>
      `${l.storageAmount} GB ${l.storageType}${l.storageExpandable ? " + expandable" : ""}`,
  },
  {
    label: "Display",
    getValue: l =>
      `${l.displaySize}"${l.displayResolution ? ` ${l.displayResolution}` : ""}${l.displayRefreshRate > 60 ? ` ${l.displayRefreshRate}Hz` : ""}`,
  },
  { label: "Panel", getValue: l => l.displayPanelType || "—" },
  { label: "Battery", getValue: l => (l.batteryLife ? `${l.batteryLife}h` : "—") },
  { label: "Weight", getValue: l => (l.weight ? `${l.weight} kg` : "—") },
  { label: "Match Score", getValue: l => `${l.matchScore}%` },
]

// Sentinel snapshots: the server snapshot ("not mounted") is what SSR and the
// hydration render see — identical to the old `loading` branch — while the real
// snapshot is only read after mount. "\u0000" can never collide with stored
// JSON, which always starts with "{".
const NOT_MOUNTED = "\u0000not-mounted"
const NO_RESULTS = "\u0000no-results"

function subscribeCompareStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  return () => window.removeEventListener("storage", onStoreChange)
}

function getCompareSnapshot(): string {
  // Envelope-aware read (v2 canonicalizes, legacy passes through untouched).
  return readResultsSnapshot() ?? NO_RESULTS
}

function getCompareServerSnapshot(): string {
  return NOT_MOUNTED
}

interface CompareState {
  laptops: RecommendedLaptop[]
  missingIds: string[]
  hasStoredResults: boolean
}

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const storedRaw = useSyncExternalStore(
    subscribeCompareStorage,
    getCompareSnapshot,
    getCompareServerSnapshot
  )

  const state = useMemo<CompareState>(() => {
    const ids = searchParams.get("ids")?.split(",") || []
    if (storedRaw === NOT_MOUNTED || storedRaw === NO_RESULTS) {
      return { laptops: [], missingIds: [], hasStoredResults: false }
    }
    try {
      const data = JSON.parse(storedRaw) as { results?: RecommendedLaptop[] }
      const allResults: RecommendedLaptop[] = data.results || []
      const filtered = allResults.filter((l: RecommendedLaptop) => ids.includes(l.id))
      const missing = ids.filter(id => !allResults.some((l: RecommendedLaptop) => l.id === id))
      return { laptops: filtered, missingIds: missing, hasStoredResults: true }
    } catch {
      return { laptops: [], missingIds: ids, hasStoredResults: true }
    }
  }, [storedRaw, searchParams])

  // Stable shell until mounted — matches the server-rendered fallback.
  if (storedRaw === NOT_MOUNTED) return null

  const { laptops, missingIds, hasStoredResults } = state

  if (!hasStoredResults) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="rounded border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">No results found</h2>
          <p className="mt-2 text-sm text-muted">
            Run the quiz first so we know which laptops to compare.
          </p>
          <Link href="/quiz" className={buttonVariants({ className: "mt-6" })}>
            Find Laptops
          </Link>
        </div>
      </div>
    )
  }

  if (missingIds.length > 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="rounded border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">Some laptops are missing</h2>
          <p className="mt-2 text-sm text-muted">
            We couldn&apos;t find these IDs in your latest results:
          </p>
          <p className="mt-2 break-all rounded-lg border border-border bg-background p-3 text-xs text-muted">
            {missingIds.join(", ")}
          </p>
          <Link href="/results" className={buttonVariants({ className: "mt-6" })}>
            Back to Results
          </Link>
        </div>
      </div>
    )
  }

  if (laptops.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="rounded border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">No laptops to compare</h2>
          <p className="mt-2 text-sm text-muted">Select laptops from your results to compare them.</p>
          <Link href="/results" className={buttonVariants({ className: "mt-6" })}>
            Back to Results
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Compare Laptops</h1>
        <p className="mt-1 text-sm text-muted">Side-by-side comparison of your top picks</p>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded border border-border bg-card shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background">
        <div
          role="region"
          aria-label="Laptop comparison table, horizontally scrollable"
          tabIndex={0}
          onKeyDown={handleTableScrollKeyDown}
          className="overflow-x-auto focus-visible:outline-none"
        >
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="bg-elevated">
                <th className="sticky left-0 z-10 min-w-[140px] bg-elevated pr-4 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Spec
                </th>
                {laptops.map(l => (
                  <th key={l.id} className="min-w-[200px] px-3 pb-4 pt-3 text-left">
                    <div className="font-mono text-[10px] text-muted">{l.brand}</div>
                    <div className="text-sm font-semibold text-foreground">{l.model}</div>
                    <div className="mt-1">
                      <MatchBadge score={l.matchScore} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className={`border-b border-border transition-colors hover:bg-accent/5${row.label === "Match Score" ? " bg-accent-success/5" : ""}`}>
                  <td className="sticky left-0 z-10 bg-card py-3 pr-4 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                    {row.label}
                  </td>
                  {laptops.map((l, idx) => {
                    const val = row.getValue(l)
                    return (
                      <td key={idx} className={`px-3 py-3 font-mono text-xs text-foreground${row.label === "Match Score" ? " font-semibold text-accent-success" : ""}`}>
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="h-4 w-4 text-accent" />
                          ) : (
                            <XIcon className="h-4 w-4 text-muted" />
                          )
                        ) : (
                          val
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 bg-card py-4 pr-4" />
                {laptops.map(l => (
                  <td key={l.id} className="px-3 py-4">
                    <BuyButton
                      href={l.affiliateUrl ?? l.url}
                      size="sm"
                      className="w-full"
                      label="View Deal"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export { CompareContent }
