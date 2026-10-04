interface TrustProps {
  laptopCount: number
  priceCount: number
  regionCount: number
}

/** Honest-limits trailing copy: live counts always, growing-catalog note when empty. */
export function honestLimitsCopy(laptopCount: number): string {
  const base = "Counts are live from the catalog right now."
  if (laptopCount === 0) {
    return `${base} The catalog is growing — matching runs against whatever is live.`
  }
  return base
}

/**
 * Trust: evidence rows — strong statement, supporting evidence,
 * and a mono tag chip per row. Counts stay live from the catalog.
 */
export function Trust({ laptopCount, priceCount, regionCount }: TrustProps) {
  return (
    <section id="trust" aria-labelledby="trust-title" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-4">Trust</p>
            <h2 id="trust-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Rankings are never sold
            </h2>
            <p className="lede mt-4">
              Matching runs on spec sheets and your workload profile. Money never touches the ranking.
            </p>
            <p className="mt-6 font-mono text-xs leading-relaxed text-muted">
              {laptopCount.toLocaleString()} machines · {priceCount.toLocaleString()} price points ·{" "}
              {regionCount.toLocaleString()} regions
            </p>
          </div>
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-xl border border-border bg-card"
              style={{ boxShadow: "var(--shadow-elev-1)" }}
            >
              <div className="grid gap-2 border-b border-border p-5 sm:grid-cols-12 sm:gap-4 sm:p-6">
                <div className="sm:col-span-9">
                  <h3 className="text-base font-semibold text-foreground">
                    Zero affiliate bias
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    Retailer links may earn a commission, but commissions never influence
                    which machines rank or in what order. The matcher never sees them.
                  </p>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:col-span-3 sm:pt-1 sm:text-right">
                  <span className="inline-block rounded-full border border-border px-2.5 py-1">firewall</span>
                </p>
              </div>
              <div className="grid gap-2 border-b border-border p-5 sm:grid-cols-12 sm:gap-4 sm:p-6">
                <div className="sm:col-span-9">
                  <h3 className="text-base font-semibold text-foreground">
                    Explained ranking
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    Every pick shows its strengths, compromises, and conflicts — the reasoning
                    is part of the result, not hidden behind the score.
                  </p>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:col-span-3 sm:pt-1 sm:text-right">
                  <span className="inline-block rounded-full border border-border px-2.5 py-1">evidence</span>
                </p>
              </div>
              <div className="grid gap-2 p-5 sm:grid-cols-12 sm:gap-4 sm:p-6">
                <div className="sm:col-span-9">
                  <h3 className="text-base font-semibold text-foreground">
                    Honest limits
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {honestLimitsCopy(laptopCount)}
                  </p>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:col-span-3 sm:pt-1 sm:text-right">
                  <span className="inline-block rounded-full border border-border px-2.5 py-1">live counts</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
