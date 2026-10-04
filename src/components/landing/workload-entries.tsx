import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
 * Server component: six scannable workload tiles with clear hierarchy —
 * index + title, explanation, hardware cue, one Start-match action each.
 * Opens the same quiz, prefilled; no fake preview.
 */
export function WorkloadEntries({ region, currency }: WorkloadEntriesProps) {
  return (
    <section id="workloads" aria-labelledby="workloads-title" className="border-b border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-10 max-w-2xl lg:mb-14">
          <p className="eyebrow mb-4">Workloads</p>
          <h2 id="workloads-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start from what you actually run
          </h2>
          <p className="lede mt-4">
            Choose the closest fit — it opens the same matching quiz, prefilled.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {WORKLOAD_IDS.map((workloadId, i) => {
            const meta = WORKLOAD_PREFILL_META[workloadId]
            const index = String(i + 1).padStart(2, "0")
            return (
              <li
                key={workloadId}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-border-strong sm:p-6"
                style={{ boxShadow: "var(--shadow-elev-1)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span aria-hidden="true" className="font-mono text-xs tracking-[0.08em] text-accent">
                    {index}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {WORKLOAD_CUES[workloadId]}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {meta.label}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{meta.blurb}</p>
                <Link
                  href={buildWorkloadPrefillPath(workloadId, region, currency)}
                  aria-label={`Start match for ${meta.label}`}
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-0"
                >
                  Start match
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
