"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ExternalLink, BarChart3,
  Cpu, Cpu as Gpu, MemoryStick as Memory, HardDrive, Monitor, BatteryFull,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MatchBadge } from "@/components/ui/progress"
import { ProductImage } from "@/components/ui/product-image"
import { formatPrice, cn } from "@/lib/utils"
import type { RecommendedLaptop } from "@/lib/types"

export function ResultsGrid({ results }: { results: RecommendedLaptop[] }) {
  const [compareList, setCompareList] = useState<string[]>([])

  const toggleCompare = (id: string) => {
    setCompareList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold">No matches found</h2>
        <p className="mt-2 text-sm text-muted">
          Try adjusting your criteria or broadening your budget.
        </p>
        <Link href="/quiz">
          <Button className="mt-6">Try Again</Button>
        </Link>
      </div>
    )
  }

  const top = results[0]

  return (
    <div>
      {/* Top Match */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-card to-card-hover p-6 sm:p-8">
        <div className="absolute right-0 top-0 rounded-bl-2xl bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
          Best Match
        </div>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start">
            <ProductImage
              src={top.imageUrl}
              alt={`${top.brand} ${top.model}`}
              width={224}
              height={144}
              priority
              className="h-32 w-48 shrink-0 rounded-lg object-cover sm:h-36 sm:w-56"
            />
            <div className="min-w-0">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted">{top.brand}</div>
              <h2 className="text-2xl font-bold text-foreground">{top.model}{top.variant ? ` (${top.variant})` : ""}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <SpecChip icon={Cpu} label={top.cpuFamily} sub={top.cpuBrand} />
                <SpecChip icon={Gpu} label={top.gpuType === "dedicated" ? (top.gpuModel || "Dedicated GPU") : "Integrated GPU"} sub={top.gpuType} />
                <SpecChip icon={Memory} label={`${top.ramAmount} GB`} sub={top.ramUpgradeable ? "Upgradeable" : "Soldered"} />
                <SpecChip icon={HardDrive} label={`${top.storageAmount} GB ${top.storageType}`} sub={top.storageExpandable ? "Expandable" : ""} />
                <SpecChip icon={Monitor} label={`${top.displaySize}"`} sub={top.displayRefreshRate >= 120 ? `${top.displayRefreshRate}Hz` : ""} />
                <SpecChip icon={BatteryFull} label={top.batteryLife ? `${top.batteryLife}h battery` : ""} sub="" />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{formatPrice(top.price, top.currency)}</div>
              <div className="mt-1">
                <MatchBadge score={top.matchScore} />
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
              {top.affiliateUrl && (
                <a href={top.affiliateUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-2">
                    View Deal <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Match reasons */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-accent/10 bg-accent/5 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Why this fits</h4>
            <ul className="space-y-1.5">
              {top.matchReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 text-accent">✓</span> {r}
                </li>
              ))}
            </ul>
          </div>
          {top.tradeoffs.length > 0 && (
            <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">Trade-offs</h4>
              <ul className="space-y-1.5">
                {top.tradeoffs.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 text-amber-500">!</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Alternative recommendations */}
      {results.length > 1 && (
      <div className="mt-12">
        <h2 className="mb-6 text-xl font-semibold">More Options</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.slice(1, 7).map((laptop, idx) => (
            <Card key={laptop.id} className="animate-fade-in transition hover:border-border" style={{ animationDelay: `${idx * 80}ms` }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <ProductImage
                    src={laptop.imageUrl}
                    alt={`${laptop.brand} ${laptop.model}`}
                    width={96}
                    height={64}
                    loading="lazy"
                    className="mb-2 h-16 w-24 rounded-lg object-cover"
                  />
                  <MatchBadge score={laptop.matchScore} />
                </div>
                <div>
                  <div className="text-xs text-muted">{laptop.brand}</div>
                  <CardTitle className="text-sm">{laptop.model}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 space-y-1 text-xs text-muted">
                  <div className="flex justify-between">
                    <span>CPU</span><span className="text-foreground">{laptop.cpuFamily}</span>
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
                    <span className="font-medium text-muted">Price</span>
                    <span className="font-semibold text-foreground">{formatPrice(laptop.price, laptop.currency)}</span>
                  </div>
                </div>

                {laptop.matchReasons.length > 0 && (
                  <div className="mb-3 rounded-md bg-card/50 p-2.5">
                    <div className="mb-1 text-xs font-medium text-accent">Why:</div>
                    <ul className="space-y-0.5">
                      {laptop.matchReasons.slice(0, 2).map((r, i) => (
                        <li key={i} className="text-xs text-muted">✓ {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleCompare(laptop.id)}
                    className={cn(compareList.includes(laptop.id) && "border-accent/50 text-accent")}>
                    {compareList.includes(laptop.id) ? "Added to Compare" : "Compare"}
                  </Button>
                  {laptop.affiliateUrl && (
                    <a href={laptop.affiliateUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
                      <Button size="sm" variant="ghost" className="gap-1">
                        View <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      )}

      {/* Compare bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 p-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-sm text-muted">
              {compareList.length} laptop{compareList.length > 1 ? "s" : ""} selected
            </span>
            <Link
              href={`/compare?ids=${compareList.join(",")}`}
            >
              <Button className="gap-2">
                Compare Now <BarChart3 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function SpecChip({ icon: Icon, label, sub }: { icon: typeof Cpu; label: string; sub: string }) {
  if (!label) return null
  return (
    <div className="flex items-center gap-2 rounded-lg bg-card/50 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-muted" />
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
    </div>
  )
}
