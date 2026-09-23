"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import type { LaptopDetail } from "@/lib/types"
import type { ExplodeLayerId } from "@/lib/layer-specs"
import { buildLayerSpecs } from "@/lib/layer-specs"

const ExplodedLaptop = dynamic(
  () => import("@/components/three/exploded-laptop"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded border border-border bg-card animate-pulse" />
    ),
  }
)

export default function ExplorerSection({ laptop }: { laptop: LaptopDetail }) {
  const [activeLayer, setActiveLayer] = useState<ExplodeLayerId | null>(null)
  const layers = buildLayerSpecs(laptop)

  const activeSpec = activeLayer
    ? layers.find((l) => l.id === activeLayer) ?? null
    : null

  const handleSelect = useCallback(
    (id: ExplodeLayerId | null) => setActiveLayer(id),
    []
  )

  return (
    <section>
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted mb-3">
        Hardware Explorer
      </h2>

      {/* Layer buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() =>
              setActiveLayer(activeLayer === layer.id ? null : layer.id)
            }
            aria-pressed={activeLayer === layer.id}
            className="font-mono text-[10px] uppercase rounded border border-border bg-card px-2 py-1 transition hover:bg-card-hover aria-pressed:border-accent aria-pressed:text-accent"
          >
            {layer.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        Exploded view — click a part to inspect its real specs
      </p>
      <ExplodedLaptop
        laptop={laptop}
        activeLayer={activeLayer}
        onSelectLayer={handleSelect}
      />

      {/* Spec panel */}
      {activeSpec && (
        <div className="mt-3 rounded border border-border bg-card p-3 font-mono text-xs">
          <p className="text-accent font-bold mb-2">{activeSpec.label}</p>
          <div className="grid gap-1">
            {activeSpec.rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <span className="text-muted">{row.label}</span>
                <span className="text-foreground text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
