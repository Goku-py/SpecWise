import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

/**
 * Static workload→hardware translation lines for the evidence panel.
 * Generic category language only — no models, prices, or catalog claims.
 */
const TRANSLATIONS = [
  { from: "Code & compiles", to: "RAM · CPU cores" },
  { from: "Games", to: "Discrete GPU · display" },
  { from: "Edits & renders", to: "Display · fast storage" },
] as const

/** Hero — single H1 on the page. Editorial split: promise left, decision evidence right. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-6">SpecWise — workload-first matching</p>
            <h1 id="hero-title" className="hero-h1 mb-6 max-w-2xl">
              Stop shopping by specs. Start shopping by how you actually use your laptop.
            </h1>
            <p className="lede mb-8 max-w-xl">
              Tell us what you run — we turn it into hardware requirements and rank
              real laptops, with reasons and trade-offs shown.
            </p>
            <div className="mb-8 flex min-h-11 flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/quiz" className={buttonVariants({ size: "lg" })}>
                Find My Laptop
              </Link>
              <Link
                href="/laptops"
                className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Browse laptops →
              </Link>
            </div>
            <p className="font-mono text-xs text-muted">
              Quick match · About 2 minutes · No account
            </p>
          </div>

          {/* Decision-evidence visual: server-rendered, illustrative only. */}
          <div className="lg:col-span-5">
            <div className="rounded border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  Decision evidence
                </p>
                <p className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  Illustrative · demo values
                </p>
              </div>
              <div className="px-5 py-5">
                <p className="mb-4 text-sm font-semibold text-foreground">
                  How usage becomes hardware
                </p>
                <ul className="space-y-3">
                  {TRANSLATIONS.map((row) => (
                    <li key={row.from} className="flex items-center gap-3 text-sm">
                      <span className="shrink-0 rounded bg-secondary-soft px-2 py-1 text-xs text-foreground">
                        {row.from}
                      </span>
                      <span aria-hidden="true" className="text-accent">→</span>
                      <span className="font-mono text-xs text-muted">{row.to}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 border-t border-border pt-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-4xl font-bold text-foreground">92</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Closest match</p>
                      <p className="font-mono text-[11px] text-muted">score · reasons · trade-offs</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
                    <div className="h-full w-[92%] rounded-full bg-accent" />
                  </div>
                </div>
                <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted">
                  Example of the reasoning shape — not a recommendation, not live data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
