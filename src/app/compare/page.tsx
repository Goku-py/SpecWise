"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchBadge } from "@/components/ui/progress"
import { formatPrice } from "@/lib/utils"
import type { RecommendedLaptop } from "@/lib/types"

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

const RESULTS_KEY = "specwise-results"

interface CompareState {
  laptops: RecommendedLaptop[]
  missingIds: string[]
  hasStoredResults: boolean
  loading: boolean
}

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const { laptops, missingIds, hasStoredResults, loading } = useMemo<CompareState>(() => {
    if (typeof window === "undefined") {
      return { laptops: [], missingIds: [], hasStoredResults: true, loading: true }
    }
    const stored = localStorage.getItem(RESULTS_KEY)
    const ids = searchParams.get("ids")?.split(",") || []
    if (!stored || ids.length === 0) {
      return { laptops: [], missingIds: [], hasStoredResults: !!stored, loading: false }
    }
    try {
      const data = JSON.parse(stored)
      const allResults: RecommendedLaptop[] = data.results || []
      const filtered = allResults.filter((l: RecommendedLaptop) => ids.includes(l.id))
      const missing = ids.filter(id => !allResults.some((l: RecommendedLaptop) => l.id === id))
      return { laptops: filtered, missingIds: missing, hasStoredResults: true, loading: false }
    } catch {
      return { laptops: [], missingIds: ids, hasStoredResults: true, loading: false }
    }
  }, [searchParams])

  if (loading) return null

  if (!hasStoredResults) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">No results found</h2>
          <p className="mt-2 text-sm text-muted">
            Run the quiz first so we know which laptops to compare.
          </p>
          <Link href="/quiz">
            <Button className="mt-6">Find Laptops</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (missingIds.length > 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">Some laptops are missing</h2>
          <p className="mt-2 text-sm text-muted">
            We couldn&apos;t find these IDs in your latest results:
          </p>
          <p className="mt-2 break-all rounded-lg border border-border bg-background p-3 text-xs text-muted">
            {missingIds.join(", ")}
          </p>
          <Link href="/results">
            <Button className="mt-6">Back to Results</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (laptops.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">No laptops to compare</h2>
          <p className="mt-2 text-sm text-muted">Select laptops from your results to compare them.</p>
          <Link href="/results">
            <Button className="mt-6">Back to Results</Button>
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="bg-accent/5">
                <th className="sticky left-0 z-10 min-w-[140px] bg-accent/5 pr-4 text-left text-sm font-semibold text-muted">
                  Spec
                </th>
                {laptops.map(l => (
                  <th key={l.id} className="min-w-[200px] px-3 pb-4 pt-3 text-left">
                    <div className="text-xs text-muted">{l.brand}</div>
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
                <tr key={row.label} className="border-b border-border transition-colors hover:bg-accent/5">
                  <td className="sticky left-0 z-10 bg-card py-3 pr-4 text-sm font-medium text-muted">
                    {row.label}
                  </td>
                  {laptops.map((l, idx) => {
                    const val = row.getValue(l)
                    return (
                      <td key={idx} className="px-3 py-3 text-sm text-foreground">
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
                    {l.affiliateUrl && (
                      <a href={l.affiliateUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="w-full">
                          View Deal
                        </Button>
                      </a>
                    )}
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

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading...</div>}>
      <CompareContent />
    </Suspense>
  )
}
