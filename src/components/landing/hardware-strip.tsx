"use client";

import { Section } from "@/components/ui/section"
import { useWorkload } from "./workload-context"
import { WORKLOAD_HIGHLIGHTS, type PartId } from "@/components/three/workload-highlights"
import { WORKLOAD_PREFILL_META } from "./lib/prefill"

const ROWS: Array<{ term: string; sentence: string; parts: PartId[] }> = [
  { term: "CPU", sentence: "Core count and family determine compile times, render throughput, and how many heavy apps stay smooth at once.", parts: ["cpu"] },
  { term: "GPU + VRAM", sentence: "A discrete GPU with ample VRAM unlocks gaming frame rates, 3D viewports, and local AI models.", parts: ["gpu", "vram"] },
  { term: "RAM", sentence: "Memory headroom keeps dozens of browser tabs, containers, and creative timelines responsive.", parts: ["ram"] },
  { term: "Storage", sentence: "Fast, roomy SSDs cut project load times and hold growing media libraries without dongles.", parts: ["storage"] },
  { term: "Display", sentence: "Resolution, refresh rate, and color gamut decide text sharpness, motion clarity, and edit accuracy.", parts: ["display"] },
  { term: "Battery", sentence: "Real-world battery life sets how long you can work unplugged — not the lab-condition headline number.", parts: ["battery"] },
  { term: "Weight + Build", sentence: "Carry weight and chassis material decide whether a laptop is a daily companion or a desk anchor.", parts: ["chassis"] },
]

/** Hardware explainer strip — rows light up for the explicitly selected workload. Plain sentences, no scores. */
export function HardwareStrip() {
  const { selected } = useWorkload()
  const activeParts: ReadonlySet<PartId> = selected
    ? new Set(WORKLOAD_HIGHLIGHTS[selected].parts)
    : new Set()
  return (
    <Section
      id="hardware"
      eyebrow="Hardware, translated"
      title="Seven specs that decide everything"
      lede="Every workload is translated into these concrete hardware requirements before any machine is ranked."
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROWS.map((row) => {
          const isRelevant = selected != null && row.parts.some((p) => activeParts.has(p))
          return (
            <div
              key={row.term}
              aria-current={isRelevant ? "true" : undefined}
              className={`rounded border p-5 ${
                selected == null
                  ? "border-border bg-card"
                  : isRelevant
                    ? "border-accent/40 bg-card-hover"
                    : "border-border bg-card opacity-70"
              }`}
            >
              <dt className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-accent">
                {row.term}
                {isRelevant && selected ? (
                  <span className="ml-2 rounded border border-accent/40 px-1.5 py-0.5 text-[10px] font-normal text-accent">
                    Relevant for {WORKLOAD_PREFILL_META[selected].label}
                  </span>
                ) : null}
              </dt>
              <dd className="text-sm leading-relaxed text-muted">{row.sentence}</dd>
            </div>
          )
        })}
      </dl>
    </Section>
  )
}
