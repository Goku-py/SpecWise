"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ExternalLink, BarChart3,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BuyButton } from "@/components/product/buy-button"
import { MatchBadge } from "@/components/ui/progress"
import { ProductImage } from "@/components/ui/product-image"
import { SpecCard } from "@/components/ui/spec-card"
import { WeightSlider } from "@/components/ui/weight-slider"
import { formatPrice, cn } from "@/lib/utils"
import type { RecommendedLaptop } from "@/lib/types"

const defaultWeights = {
  cpu: 0.85,
  gpu: 0.70,
  display: 0.60,
  battery: 0.45,
  thermal: 0.40,
}

export function ResultsGrid({ results }: { results: RecommendedLaptop[] }) {
  const [compareList, setCompareList] = useState<string[]>([])
  const [weights, setWeights] = useState(defaultWeights)

  const toggleCompare = (id: string) => {
    setCompareList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const updateWeight = (key: keyof typeof weights) => (value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }))
  }

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold">No matches found</h2>
        <p className="mt-2 text-sm text-muted">
          Try adjusting your criteria or broadening your budget.
        </p>
        <Link href="/quiz" className={buttonVariants({ className: "mt-6" })}>
          Try Again
        </Link>
      </div>
    )
  }

  const top = results[0]

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Left sidebar: Weight Adjuster (25%) */}
      <div className="lg:col-span-1">
        <div className="sticky top-20">
          <div className="rounded border border-border bg-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Weight Adjuster</h3>
            <div className="space-y-4">
              <WeightSlider
                label="CPU Multi-Core"
                value={weights.cpu}
                onChange={updateWeight("cpu")}
              />
              <WeightSlider
                label="GPU VRAM / TGP"
                value={weights.gpu}
                onChange={updateWeight("gpu")}
              />
              <WeightSlider
                label="Display Quality"
                value={weights.display}
                onChange={updateWeight("display")}
              />
              <WeightSlider
                label="Battery / Portability"
                value={weights.battery}
                onChange={updateWeight("battery")}
              />
              <WeightSlider
                label="Noise / Thermal"
                value={weights.thermal}
                onChange={updateWeight("thermal")}
              />
            </div>
            <button
              onClick={() => setWeights(defaultWeights)}
              className="mt-4 w-full rounded border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
            >
              Reset Weights
            </button>
          </div>
        </div>
      </div>

      {/* Right area: Ranked recommendations (75%) */}
      <div className="lg:col-span-4">
        {/* Top Match */}
        <Card className="relative overflow-hidden border-accent/20 bg-card p-6 sm:p-8">
          <div className="absolute right-0 top-0 rounded-bl bg-accent px-4 py-1.5 text-xs font-bold text-background">
            BEST MATCH
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start">
              <ProductImage
                src={top.imageUrl}
                alt={`${top.brand} ${top.model}`}
                width={224}
                height={144}
                priority
                className="h-32 w-48 shrink-0 rounded object-cover sm:h-36 sm:w-56"
              />
              <div className="min-w-0">
                <div className="mb-1 text-xs uppercase tracking-wider text-muted font-mono">{top.brand}</div>
                <h2 className="text-xl font-bold text-foreground">{top.model}{top.variant ? ` (${top.variant})` : ""}</h2>
                <div className="mt-2">
                  <MatchBadge score={top.matchScore} />
                </div>
                <div className="mt-3 text-sm text-muted">
                  {formatPrice(top.price, top.currency)} &bull; {top.region}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleCompare(top.id)}
              >
                {compareList.includes(top.id) ? "Added" : "Compare"}
              </Button>
              <BuyButton
                href={top.affiliateUrl ?? top.url}
                size="sm"
                className="gap-2"
                label={
                  <>
                    View Deal <ExternalLink className="h-3.5 w-3.5" />
                  </>
                }
              />
            </div>
          </div>

          {/* Spec Matrix */}
          <div className="mt-6">
            <SpecCard
              specs={[
                { label: "CPU", value: top.cpuFamily },
                { label: "GPU", value: top.gpuType === "dedicated" ? (top.gpuModel || "Dedicated") : "Integrated" },
                { label: "TGP", value: top.cpuCores ? `${top.cpuCores} cores` : "—" },
                { label: "RAM", value: `${top.ramAmount} GB ${top.ramUpgradeable ? "(SODIMM)" : ""}` },
                { label: "Display", value: `${top.displaySize}" ${top.displayResolution || ""} ${top.displayRefreshRate}Hz` },
                { label: "Storage", value: `${top.storageAmount} GB ${top.storageType}` },
                { label: "Battery", value: top.batteryLife ? `${top.batteryLife}h` : "—" },
                { label: "Weight", value: top.weight ? `${top.weight} kg` : "—" },
              ]}
            />
          </div>

          {/* Match Breakdown */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-accent-success/20 bg-accent-success/5 p-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-success">Why this fits</h4>
              <ul className="space-y-1.5 font-mono text-xs">
                {top.matchReasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground">
                    <span className="mt-0.5 text-accent-success">[+]</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            {top.tradeoffs.length > 0 && (
              <div className="rounded border border-accent-warning/20 bg-accent-warning/5 p-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-warning">Trade-offs</h4>
                <ul className="space-y-1.5 font-mono text-xs">
                  {top.tradeoffs.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-foreground">
                      <span className="mt-0.5 text-accent-warning">[-]</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/laptops/${top.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <span className="font-mono text-xs">[ VIEW FULL SPEC SHEET ]</span>
            </Link>
            <Button variant="ghost" size="sm">
              <span className="font-mono text-xs">[ RAW BENCHMARK DATA ]</span>
            </Button>
            <BuyButton
              href={top.affiliateUrl ?? top.url}
              size="sm"
              label={<span className="font-mono text-xs">[ DIRECT VENDOR LINKS ]</span>}
            />
          </div>
        </Card>

        {/* Alternative recommendations */}
        {results.length > 1 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold">More Options</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {results.slice(1, 7).map((laptop, idx) => (
              <Card key={laptop.id} className="animate-fade-in transition hover:border-border-strong" style={{ animationDelay: `${idx * 80}ms` }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <ProductImage
                      src={laptop.imageUrl}
                      alt={`${laptop.brand} ${laptop.model}`}
                      width={96}
                      height={64}
                      loading="lazy"
                      className="mb-2 h-16 w-24 rounded object-cover"
                    />
                    <MatchBadge score={laptop.matchScore} />
                  </div>
                  <div>
                    <div className="text-xs text-muted font-mono">{laptop.brand}</div>
                    <CardTitle className="text-sm">{laptop.model}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 space-y-1 text-xs text-muted font-mono">
                    <div className="flex justify-between">
                      <span>CPU</span><span className="text-foreground">{laptop.cpuFamily}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GPU</span><span className="text-foreground">{laptop.gpuType === "dedicated" ? laptop.gpuModel : "Integrated"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RAM</span><span className="text-foreground">{laptop.ramAmount} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage</span><span className="text-foreground">{laptop.storageAmount} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Display</span><span className="text-foreground">{laptop.displaySize}&quot;</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Battery</span><span className="text-foreground">{laptop.batteryLife ? `${laptop.batteryLife}h` : "—"}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted">Price</span>
                      <span className="font-semibold text-foreground">{formatPrice(laptop.price, laptop.currency)}</span>
                    </div>
                  </div>

                  {laptop.matchReasons.length > 0 && (
                    <div className="mb-3 rounded border border-border bg-secondary p-2.5">
                      <div className="mb-1 text-xs font-medium text-accent font-mono">MATCH:</div>
                      <ul className="space-y-0.5 font-mono text-[11px]">
                        {laptop.matchReasons.slice(0, 2).map((r, i) => (
                          <li key={i} className="text-muted">[+] {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleCompare(laptop.id)}
                      className={cn(compareList.includes(laptop.id) && "border-accent text-accent")}>
                      {compareList.includes(laptop.id) ? "Added" : "Compare"}
                    </Button>
                    <BuyButton
                      href={laptop.affiliateUrl ?? laptop.url}
                      size="sm"
                      variant="ghost"
                      className="ml-auto gap-1"
                      label={
                        <>
                          View <ExternalLink className="h-3 w-3" />
                        </>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        )}

        {/* Compare bar */}
        {compareList.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <span className="text-sm text-muted font-mono">
                {compareList.length} laptop{compareList.length > 1 ? "s" : ""} selected
              </span>
              <Link
                href={`/compare?ids=${compareList.join(",")}`}
                className={buttonVariants({ className: "gap-2" })}
              >
                <span className="font-mono text-xs">COMPARE NOW</span> <BarChart3 className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
