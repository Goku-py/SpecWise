import Link from "next/link"
import { WORKLOAD_PREFILL_META, buildWorkloadPrefillPath } from "./lib/prefill"
import { WORKLOAD_IDS } from "./data/illustrative-picks"
import type { WorkloadId } from "@/lib/recommend/v3/types"

/**
 * Generic hardware cues per workload — category language only,
 * no models, counts, or catalog claims.
 */
const WORKLOAD_CUES: Record<WorkloadId, string> = {
  dev: "RAM · CPU cores · keyboard",
  gaming: "Discrete GPU · refresh rate · cooling",
  "ai-ml": "VRAM · sustained compute · RAM",
  "video-photo": "Display gamut · resolution · storage speed",
  "cad-3d": "Pro GPU · RAM · display size",
  "study-office": "Weight · battery · keyboard",
}

interface WorkloadEntriesProps {
  region: string
  currency: string
}

/**
 * Server component: editorial choose-your-workload ledger — numbered rows
 * with name, explanation, hardware cues, and one Start-match action each.
 * Opens the same quiz, prefilled; no fake preview.
 */
export function WorkloadEntries({ region, currency }: WorkloadEntriesProps) {
  return (
    <section id="workloads" aria-labelledby="workloads-title" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-12 max-w-2xl lg:mb-16">
          <p className="eyebrow mb-4">Workloads</p>
          <h2 id="workloads-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start from what you actually run
          </h2>
          <p className="lede mt-4">
            Choose the closest fit — it opens the same matching quiz, prefilled.
          </p>
        </div>
        <ol className="border-t border-border">
          {WORKLOAD_IDS.map((workloadId, i) => {
            const meta = WORKLOAD_PREFILL_META[workloadId]
            const index = String(i + 1).padStart(2, "0")
            return (
              <li
                key={workloadId}
                className="group grid gap-2 border-b border-border py-7 transition-colors sm:grid-cols-12 sm:items-baseline sm:gap-4 lg:py-8"
              >
                <span aria-hidden="true" className="font-mono text-xs tracking-[0.08em] text-muted sm:col-span-1">
                  {index}
                </span>
                <h3 className="text-xl font-bold tracking-tight text-foreground sm:col-span-4 lg:text-2xl">
                  {meta.label}
                </h3>
                <div className="sm:col-span-5">
                  <p className="max-w-md text-sm leading-relaxed text-muted">{meta.blurb}</p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                    {WORKLOAD_CUES[workloadId]}
                  </p>
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  <Link
                    href={buildWorkloadPrefillPath(workloadId, region, currency)}
                    aria-label={`Start match for ${meta.label}`}
                    className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-0"
                  >
                    Start match →
                  </Link>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
