"use client";

import { WORKLOAD_PREFILL_META, buildWorkloadPrefillPath } from "./lib/prefill"
import { WORKLOAD_IDS } from "./data/illustrative-picks"
import type { IllustrativeMachine } from "./illustrative-machine"
import type { WorkloadId } from "@/lib/recommend/v3/types"
import { IllustrativeMachineCard } from "./illustrative-machine-card"
import { useWorkload } from "./workload-context"

interface CatalogProofViewProps {
  machines: Record<WorkloadId, IllustrativeMachine[]>
  region: string
  currency: string
}

/**
 * Client view for the catalog proof section. Orders groups explicit-first
 * when a workload is selected; all groups and labels still render.
 */
export function CatalogProofView({ machines, region, currency }: CatalogProofViewProps) {
  const { selected } = useWorkload()
  const ordered: WorkloadId[] =
    selected != null
      ? [selected, ...WORKLOAD_IDS.filter((id) => id !== selected)]
      : [...WORKLOAD_IDS]
  return (
    <div className="flex flex-col gap-10">
        {ordered.map((workloadId) => (
          <div key={workloadId}>
            <h3 className="mb-4 flex flex-wrap items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-foreground">
              {WORKLOAD_PREFILL_META[workloadId].label}
              {selected === workloadId ? (
                <span className="rounded border border-accent/40 px-1.5 py-0.5 text-[10px] font-normal text-accent">
                  Selected workload
                </span>
              ) : null}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              {machines[workloadId]?.map((machine) => (
                <IllustrativeMachineCard
                  key={machine.id}
                  machine={machine}
                  workloadLabel={WORKLOAD_PREFILL_META[workloadId].label}
                  prefillHref={buildWorkloadPrefillPath(workloadId, region, currency)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
  )
}
