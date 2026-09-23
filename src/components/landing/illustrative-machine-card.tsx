import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { IllustrativeMachine } from "./illustrative-machine"

function formatPrice(m: IllustrativeMachine): string {
  if (m.priceMissing) return "Price unavailable"
  const amount = m.price.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return `${m.currency} ${amount}${m.priceStale ? " (stale)" : ""}`
}

/** Display-only machine card. No scores, no ranking claims — specs + price only. */
export function IllustrativeMachineCard({
  machine,
  workloadLabel,
  prefillHref,
}: {
  machine: IllustrativeMachine
  workloadLabel: string
  prefillHref: string
}) {
  const title = `${machine.brand} ${machine.model}${machine.variant ? ` ${machine.variant}` : ""}`
  return (
    <article className="flex min-h-11 flex-col rounded border border-border bg-card p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
      <Badge variant="accent" className="mb-3 self-start">
        Illustrative pick
      </Badge>
      <h3 className="mb-1 text-sm font-semibold text-foreground">
        <Link
          href={`/laptops/${machine.slug}`}
          className="transition-colors hover:text-accent focus-visible:outline-none"
        >
          {title}
        </Link>
      </h3>
      <p className="mb-3 font-mono text-xs text-muted">{formatPrice(machine)}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div><dt className="sr-only">CPU</dt><dd className="text-muted">CPU · <span className="text-foreground">{machine.cpuFamily}</span></dd></div>
        <div><dt className="sr-only">GPU</dt><dd className="text-muted">GPU · <span className="text-foreground">{machine.gpuModel ?? "Integrated"}{machine.gpuVRAM != null ? ` · ${machine.gpuVRAM}GB` : ""}</span></dd></div>
        <div><dt className="sr-only">RAM</dt><dd className="text-muted">RAM · <span className="text-foreground">{machine.ramAmount}GB</span></dd></div>
        <div><dt className="sr-only">Storage</dt><dd className="text-muted">SSD · <span className="text-foreground">{machine.storageAmount}GB</span></dd></div>
        <div><dt className="sr-only">Display</dt><dd className="text-muted">Display · <span className="text-foreground">{machine.displaySize}&quot;{machine.displayResolution ? ` · ${machine.displayResolution}` : ""} · {machine.displayRefreshRate}Hz</span></dd></div>
        <div><dt className="sr-only">Portability</dt><dd className="text-muted">Carry · <span className="text-foreground">{machine.weight != null ? `${machine.weight}kg` : "—"}{machine.batteryLife != null ? ` · ${machine.batteryLife}h` : ""}</span></dd></div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Example for {workloadLabel} — your quiz result will differ.
      </p>
      <Link
        href={prefillHref}
        className="mt-2 inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Check my match →
      </Link>
    </article>
  )
}
