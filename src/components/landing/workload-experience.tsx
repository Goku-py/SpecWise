"use client";

import Link from "next/link"
import { Code, Gamepad2, BrainCircuit, Palette, Box, GraduationCap } from "lucide-react"
import { Section } from "@/components/ui/section"
import { WORKLOAD_PREFILL_META, buildWorkloadPrefillPath } from "./lib/prefill"
import { HARDWARE_VOCAB, WORKLOAD_HIGHLIGHTS } from "@/components/three/workload-highlights"
import { WORKLOAD_IDS } from "./data/illustrative-picks"
import type { WorkloadId } from "@/lib/recommend/v3/types"
import { useWorkload } from "./workload-context"

const WORKLOAD_ICONS: Record<WorkloadId, typeof Code> = {
  dev: Code,
  gaming: Gamepad2,
  "ai-ml": BrainCircuit,
  "video-photo": Palette,
  "cad-3d": Box,
  "study-office": GraduationCap,
}

interface WorkloadExperienceProps {
  region: string
  currency: string
}

/**
 * P2 workload cards. Each card offers two actions: an explicit preview
 * button that lights up the hardware above (visual context only, no
 * navigation, no quiz state) and the existing prefill link that opens the
 * quiz prefilled.
 */
export function WorkloadExperience({ region, currency }: WorkloadExperienceProps) {
  const { selected, select, clear } = useWorkload()
  return (
    <Section
      id="workloads"
      eyebrow="Workloads"
      title="Start from what you actually run"
      lede="Preview a workload to light up the hardware above — Start match opens the quiz prefilled."
    >
      {selected ? (
        <button
          type="button"
          onClick={clear}
          className="mb-4 inline-flex min-h-11 items-center rounded border border-border bg-card px-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent/30 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Clear selection / resume overview
        </button>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WORKLOAD_IDS.map((workloadId) => {
          const Icon = WORKLOAD_ICONS[workloadId]
          const meta = WORKLOAD_PREFILL_META[workloadId]
          const href = buildWorkloadPrefillPath(workloadId, region, currency)
          const isSelected = selected === workloadId
          return (
            <div
              key={workloadId}
              className={`flex min-h-11 flex-col rounded border bg-card p-5 transition-all duration-150 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
                isSelected
                  ? "border-accent/40 bg-card-hover"
                  : "border-border hover:-translate-y-0.5 hover:border-accent/30 hover:bg-card-hover"
              }`}
            >
              <Icon className="mb-3 h-5 w-5 text-accent" aria-hidden="true" />
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                {meta.label}
                {isSelected ? (
                  <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                    Selected
                  </span>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-muted">{meta.blurb}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Lights up: {WORKLOAD_HIGHLIGHTS[workloadId].parts.map((p) => HARDWARE_VOCAB[p].label).join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => select(workloadId)}
                  className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Preview {meta.label} here
                </button>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Start match →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
