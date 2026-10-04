import { Check, X } from "lucide-react"

/** Static demonstration fixture — hardcoded sample values, never live data. */
export const SAMPLE_PROOF_SCORE = 92
export const SAMPLE_PROOF_LABEL = "Closest match"
export const SAMPLE_PROOF_BADGE = "Demonstration — sample answers, not live data"

export const SAMPLE_PROOF_FIXTURE = {
  score: SAMPLE_PROOF_SCORE,
  label: SAMPLE_PROOF_LABEL,
  strengths: [
    "16 GB memory — room for heavy multitasking",
    "8-core processor for compile-heavy work",
  ],
  tradeoff: "Gives up: ~10 h battery — you wanted 12 h+",
  bars: [
    { label: "Workload fit", value: 92 },
    { label: "Requirements fit", value: 88 },
    { label: "Value", value: 81 },
  ],
} as const

/**
 * Static score ring — server-rendered SVG, no client JS.
 * Replaces the animated client meter so the homepage ships zero interaction JS.
 */
function StaticScoreRing({ score }: { score: number }) {
  const size = 120
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const cx = size / 2
  const cy = size / 2
  return (
    <div
      className="inline-flex shrink-0 flex-col items-center gap-1"
      role="img"
      aria-label={`Match score: ${score}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--accent-success)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--foreground)"
          className="font-mono"
          fontSize={28}
          fontWeight={700}
        >
          {score}
        </text>
      </svg>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Match score</span>
    </div>
  )
}

/**
 * SampleProof — result-artifact composition foreshadowing the Results page.
 * Editorial split: verdict statement left, evidence artifact right.
 * No names, no prices.
 */
export function SampleProof() {
  return (
    <section aria-labelledby="proof-title" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">Example output</p>
            <h2 id="proof-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Every result explains itself.
            </h2>
            <p className="lede mt-4 max-w-md">
              A sample of the shape every result takes — score, reasons, trade-offs.
              Your answers produce your own ranking.
            </p>
            <p className="mt-6 font-mono text-xs text-muted">
              score / evidence / compromise — shown together
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="border-l-2 border-accent bg-card/40 pl-6 sm:pl-8">
              <p className="mb-5 inline-block rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                {SAMPLE_PROOF_BADGE}
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <StaticScoreRing score={SAMPLE_PROOF_FIXTURE.score} />
                <div>
                  <p className="text-xl font-bold text-foreground">{SAMPLE_PROOF_FIXTURE.label}</p>
                  <p className="mt-1 text-sm text-muted">The top pick for these sample answers.</p>
                </div>
              </div>
              <ul className="mt-6 space-y-2">
                {SAMPLE_PROOF_FIXTURE.strengths.map((strength) => (
                  <li key={strength} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-success" aria-hidden="true" />
                    {strength}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-muted">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-accent-danger" aria-hidden="true" />
                  {SAMPLE_PROOF_FIXTURE.tradeoff}
                </li>
              </ul>
              <div className="mt-6 border-t border-border pt-5" aria-hidden="true">
                <div className="grid gap-4 sm:grid-cols-3">
                  {SAMPLE_PROOF_FIXTURE.bars.map((bar) => (
                    <div key={bar.label}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-xs text-muted">{bar.label}</span>
                        <span className="font-mono text-xs text-foreground">{bar.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="sr-only">
                Demo scores: workload fit 92, requirements fit 88, value 81.
              </p>
              <p className="mt-5 text-xs leading-relaxed text-muted">
                This is the shape of a SpecWise result: score, reasons, trade-offs.
                Your answers produce your own ranking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
