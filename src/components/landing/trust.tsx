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
 * Trust: evidential ledger — strong statement, supporting evidence,
 * and mono metadata per row, separated by dividers. No benefit cards.
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
          </div>
          <div className="lg:col-span-8">
            <div className="border-t border-border">
              <div className="grid gap-2 border-b border-border py-7 sm:grid-cols-12 sm:gap-4">
                <h3 className="text-lg font-semibold text-foreground sm:col-span-4">
                  Zero affiliate bias
                </h3>
                <p className="text-sm leading-relaxed text-muted sm:col-span-6">
                  Retailer links may earn a commission, but commissions never influence
                  which machines rank or in what order. The matcher never sees them.
                </p>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:col-span-2 sm:text-right">
                  firewall
                </p>
              </div>
              <div className="grid gap-2 border-b border-border py-7 sm:grid-cols-12 sm:gap-4">
                <h3 className="text-lg font-semibold text-foreground sm:col-span-4">
                  Explained ranking
                </h3>
                <p className="text-sm leading-relaxed text-muted sm:col-span-6">
                  Every pick shows its strengths, compromises, and conflicts — the reasoning
                  is part of the result, not hidden behind the score.
                </p>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:col-span-2 sm:text-right">
                  evidence
                </p>
              </div>
              <div className="grid gap-2 border-b border-border py-7 sm:grid-cols-12 sm:gap-4">
                <h3 className="text-lg font-semibold text-foreground sm:col-span-4">
                  Honest limits
                </h3>
                <p className="text-sm leading-relaxed text-muted sm:col-span-6">
                  {laptopCount.toLocaleString()} machines · {priceCount.toLocaleString()} price points ·{" "}
                  {regionCount.toLocaleString()} regions. {honestLimitsCopy(laptopCount)}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:col-span-2 sm:text-right">
                  live counts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
