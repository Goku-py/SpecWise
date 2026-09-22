"use client"

import { useState } from "react"
import { AlertTriangle, ChevronDown, X, Zap } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { MatchBadge } from "@/components/ui/progress"
import { ProductImage } from "@/components/ui/product-image"
import { cn, formatPrice } from "@/lib/utils"
import type { Bottleneck, ScoreableProduct } from "@/lib/recommendation"

interface Props {
  item: ScoreableProduct
  /** calculateBuildScore(...).score in [0,1]. */
  score: number
  bottlenecks: Bottleneck[]
  currency: string
}

const HIGHLIGHT_LABELS: { key: string; label: string }[] = [
  { key: "cpu", label: "CPU" },
  { key: "gpu", label: "GPU" },
  { key: "ram", label: "RAM" },
  { key: "display", label: "Display" },
]

function highlights(item: ScoreableProduct): { key: string; label: string; value: string }[] {
  const s = item.laptopSpec
  const cpu = `${s.cpuBrand} ${s.cpuFamily}${s.cpuCores ? ` · ${s.cpuCores}C` : ""}`
  const gpu =
    s.gpuType === "INTEGRATED"
      ? "Integrated"
      : `${s.gpuModel ?? "dGPU"}${s.gpuVRAMGb ? ` · ${s.gpuVRAMGb}GB` : ""}`
  const ram = `${s.ramAmountGb}GB ${s.ramType ?? ""}`.trim()
  const display = `${s.displaySizeIn}" ${s.displayPanelType ?? ""} ${s.displayRefreshHz}Hz${s.displayNits ? ` · ${s.displayNits}nits` : ""}`.trim()
  const map: Record<string, string> = { cpu, gpu, ram, display }
  return HIGHLIGHT_LABELS.map(h => ({ ...h, value: map[h.key] ?? "—" }))
}

/** Level 1–3 progressive disclosure card: summary → warnings → full spec drawer. */
export function ProductRecommendationCard({ item, score, bottlenecks, currency }: Props) {
  const [open, setOpen] = useState(false)
  const pct = Math.round(score * 100)
  const priceLabel = item.price != null && Number.isFinite(item.price) ? formatPrice(item.price, currency) : "Price TBD"

  return (
    <>
      <article className="rounded border border-border bg-card p-4 transition hover:border-accent/30 sm:p-5">
        {/* Level 1 — always visible */}
        <div className="flex gap-4">
          <ProductImage
            src={item.product.imageUrl ?? null}
            alt={item.product.name}
            width={96}
            height={96}
            className="h-20 w-20 rounded-lg sm:h-24 sm:w-24"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{item.product.brandLabel}</p>
                <h3 className="truncate text-base font-semibold text-foreground">{item.product.name}</h3>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-semibold text-foreground">{priceLabel}</div>
                <MatchBadge score={pct} />
              </div>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              {highlights(item).map(h => (
                <div key={h.key} className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wider text-muted">{h.label}</dt>
                  <dd className="truncate font-mono text-xs text-foreground">{h.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Level 2 — bottleneck warnings */}
        {bottlenecks.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {bottlenecks.map(b => (
              <li
                key={b.code}
                className="inline-flex items-center gap-1.5 rounded border border-accent-warning/30 bg-accent-warning/10 px-2 py-1 text-xs text-accent-warning"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {b.message}
              </li>
            ))}
          </ul>
        )}

        {/* Level 3 — expand */}
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-expanded={open}>
            View full spec sheet
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </article>

      {/* Right-slide drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`${item.product.name} full spec sheet`}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            >
              <header className="flex items-start justify-between gap-3 border-b border-border p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{item.product.brandLabel}</p>
                  <h2 className="text-lg font-semibold text-foreground">{item.product.name}</h2>
                  <p className="mt-0.5 font-mono text-sm text-accent">
                    {priceLabel} · {pct}% match
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close spec sheet"
                  className="rounded p-1.5 text-muted transition hover:bg-card-hover hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <SpecSection title="Processor">
                  <SpecRow label="Brand" value={item.laptopSpec.cpuBrand} />
                  <SpecRow label="Family" value={item.laptopSpec.cpuFamily} />
                  <SpecRow label="Generation" value={item.laptopSpec.cpuGeneration} />
                  <SpecRow label="Cores / Threads" value={pair(item.laptopSpec.cpuCores, item.laptopSpec.cpuThreads)} />
                  <SpecRow label="Benchmark" value={item.laptopSpec.cpuBenchmark != null ? String(item.laptopSpec.cpuBenchmark) : null} />
                </SpecSection>

                <SpecSection title="Graphics">
                  <SpecRow label="Type" value={item.laptopSpec.gpuType} />
                  <SpecRow label="Model" value={item.laptopSpec.gpuModel} />
                  <SpecRow label="VRAM" value={item.laptopSpec.gpuVRAMGb != null ? `${item.laptopSpec.gpuVRAMGb} GB` : null} />
                  <SpecRow label="TGP" value={item.laptopSpec.gpuTgpW != null ? `${item.laptopSpec.gpuTgpW} W` : null} />
                </SpecSection>

                <SpecSection title="Memory & Storage">
                  <SpecRow label="RAM" value={`${item.laptopSpec.ramAmountGb} GB ${item.laptopSpec.ramType ?? ""}`.trim()} />
                  <SpecRow label="RAM upgradeable" value={yn(item.laptopSpec.ramUpgradeable)} />
                  <SpecRow label="Storage" value={`${item.laptopSpec.storageAmountGb} GB ${item.laptopSpec.storageType}`} />
                  <SpecRow label="Storage expandable" value={yn(item.laptopSpec.storageExpandable)} />
                </SpecSection>

                <SpecSection title="Display">
                  <SpecRow label="Size" value={`${item.laptopSpec.displaySizeIn}"`} />
                  <SpecRow label="Resolution" value={pair(item.laptopSpec.displayWidthPx, item.laptopSpec.displayHeightPx, " × ")} />
                  <SpecRow label="Refresh" value={`${item.laptopSpec.displayRefreshHz} Hz`} />
                  <SpecRow label="Panel" value={item.laptopSpec.displayPanelType} />
                  <SpecRow label="Brightness" value={item.laptopSpec.displayNits != null ? `${item.laptopSpec.displayNits} nits` : null} />
                  <SpecRow label="Touch" value={yn(item.laptopSpec.displayTouch)} />
                </SpecSection>

                <SpecSection title="Battery & Thermals">
                  <SpecRow label="Battery" value={item.laptopSpec.batteryWh != null ? `${item.laptopSpec.batteryWh} Wh` : null} />
                  <SpecRow label="Battery life" value={item.laptopSpec.batteryLifeHr != null ? `${item.laptopSpec.batteryLifeHr} hrs` : null} />
                  <SpecRow label="GPU TGP" value={item.laptopSpec.gpuTgpW != null ? `${item.laptopSpec.gpuTgpW} W` : null} />
                  <SpecRow label="Weight" value={item.laptopSpec.weightKg != null ? `${item.laptopSpec.weightKg} kg` : null} />
                </SpecSection>

                <SpecSection title="Ports & Wireless">
                  <SpecRow
                    label="Ports"
                    value={
                      item.laptopSpec.ports.length
                        ? item.laptopSpec.ports.map(p => `${p.kind}${p.count > 1 ? ` ×${p.count}` : ""}`).join(", ")
                        : null
                    }
                  />
                  <SpecRow
                    label="Wireless"
                    value={item.laptopSpec.wires.length ? item.laptopSpec.wires.map(w => w.wire).join(", ") : null}
                  />
                  <SpecRow label="Webcam" value={item.laptopSpec.webcam} />
                  <SpecRow label="Backlit keyboard" value={yn(item.laptopSpec.keyboardBacklit)} />
                </SpecSection>

                {bottlenecks.length > 0 && (
                  <div className="rounded border border-accent-warning/30 bg-accent-warning/10 p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-accent-warning">
                      <Zap className="h-3.5 w-3.5" /> Things to know
                    </div>
                    <ul className="space-y-1 text-xs text-accent-warning/90">
                      {bottlenecks.map(b => (
                        <li key={b.code}>• {b.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function SpecSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-border bg-card p-3">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={cn("text-right font-mono text-xs text-foreground", !value && "text-muted/50")}>
        {value || "—"}
      </span>
    </div>
  )
}

function yn(v: boolean | null | undefined): string | null {
  if (v == null) return null
  return v ? "Yes" : "No"
}

function pair(a: number | null | undefined, b: number | null | undefined, sep = " / "): string | null {
  if (a == null && b == null) return null
  return `${a ?? "—"}${sep}${b ?? "—"}`
}
