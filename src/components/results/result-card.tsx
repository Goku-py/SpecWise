"use client"

import { ExternalLink } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { FScoreMeter } from "@/components/charts/f-score-meter"
import { formatPrice, cn } from "@/lib/utils"
import type { RecommendedLaptop } from "@/lib/types"
import type { RankedBreakdown } from "@/lib/view-models"

export interface LaptopResultCardProps {
  laptop: RecommendedLaptop
  rank: number
  breakdown?: RankedBreakdown
  isTop: boolean
  compared: boolean
  onToggleCompare: (id: string) => void
}

export function LaptopResultCard({
  laptop,
  rank,
  breakdown,
  isTop,
  compared,
  onToggleCompare,
}: LaptopResultCardProps) {
  const topDrivers = breakdown
    ? [...breakdown.dimensions]
        .sort((a, b) => b.deltaVsPool - a.deltaVsPool)
        .slice(0, 3)
    : []

  const inStock = laptop.retailers.length > 0

  return (
    <div
      className={cn(
        "rounded border bg-card p-4 transition-colors",
        isTop ? "border-accent/30" : "border-border hover:border-accent/30"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Rank */}
        <span className="font-mono text-2xl font-bold text-accent leading-none shrink-0">
          #{rank}
        </span>

        <div className="flex-1 min-w-0">
          {/* Brand + model */}
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {laptop.brand}
          </div>
          <h3 className="text-sm font-semibold text-foreground truncate">
            {laptop.model}{laptop.variant ? ` (${laptop.variant})` : ""}
          </h3>
        </div>

        {/* F-score (small) */}
        <div className="shrink-0">
          <FScoreMeter score={laptop.matchScore} size={56} animate={false} />
        </div>
      </div>

      {/* Price + stock */}
      <div className="mt-2 flex items-center gap-2 text-xs font-mono text-muted">
        <span>{formatPrice(laptop.price, laptop.currency)}</span>
        <span className="text-text-tertiary">&bull;</span>
        <span>{laptop.region}</span>
        {inStock && (
          <>
            <span className="text-text-tertiary">&bull;</span>
            <span className="text-accent-success font-semibold">IN STOCK</span>
          </>
        )}
      </div>

      {/* Spec rows — 2-col grid */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
        <SpecRow label="CPU" value={laptop.cpuFamily} />
        <SpecRow
          label="GPU"
          value={laptop.gpuType === "dedicated" ? laptop.gpuModel || "Dedicated" : "Integrated"}
        />
        <SpecRow label="RAM" value={`${laptop.ramAmount} GB`} />
        <SpecRow
          label="DISPLAY"
          value={`${laptop.displaySize}&quot; ${laptop.displayRefreshRate}Hz`}
        />
        <SpecRow label="STORAGE" value={`${laptop.storageAmount} GB`} />
        <SpecRow label="BATTERY" value={laptop.batteryLife ? `${laptop.batteryLife}h` : "—"} />
        <SpecRow label="WEIGHT" value={laptop.weight ? `${laptop.weight} kg` : "—"} />
      </div>

      {/* WHY IT RANKED #1 */}
      {isTop && topDrivers.length > 0 && (
        <div className="mt-4 rounded border border-accent-success/20 bg-accent-success/5 p-3">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent-success">
            WHY IT RANKED #1
          </h4>
          <ul className="space-y-1">
            {topDrivers.map((d) => {
              const positive = d.deltaVsPool > 0
              return (
                <li key={d.dim} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className={cn("font-semibold", positive ? "text-accent-success" : "text-accent-danger")}>
                    {positive ? "+" : ""}
                    {d.deltaVsPool.toFixed(1)}%
                  </span>
                  <span className="text-muted">vs pool avg</span>
                  <span className="ml-auto text-foreground">{d.dim.toUpperCase()}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleCompare(laptop.id)}
          className={cn(compared && "border-accent text-accent")}
        >
          {compared ? "Added" : "Compare"}
        </Button>
        {(laptop.affiliateUrl ?? laptop.url) && (
          <a
            href={laptop.affiliateUrl ?? laptop.url!}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "ml-auto gap-1" })}
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
