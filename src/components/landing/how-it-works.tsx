const STEPS = [
  {
    n: "01",
    title: "Tell us how you use your laptop.",
    body: "Pick the workloads you actually run — code, games, edits, models, or everyday office work.",
  },
  {
    n: "02",
    title: "SpecWise translates that into requirements and weighs what matters.",
    body: "Your usage becomes concrete hardware needs — memory, processor, graphics, display, battery.",
  },
  {
    n: "03",
    title: "Get ranked laptops with reasons, trade-offs, and confidence.",
    body: "Every pick shows why it fits, what it gives up, and how sure the match is.",
  },
] as const

/**
 * HowItWorks — one connected flow: a continuous rail with a node per
 * step, not separate cards. Keeps the #methodology anchor.
 */
export function HowItWorks() {
  return (
    <section id="methodology" aria-labelledby="methodology-title" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-4">How it works</p>
            <h2 id="methodology-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From how you work to what to buy
            </h2>
            <p className="lede mt-4">
              Three steps. No spec-sheet archaeology required.
            </p>
            <p className="mt-6 font-mono text-xs text-muted">
              ~2 min · fine-tuning optional · skip anytime
            </p>
          </div>
          <ol className="relative lg:col-span-8">
            {/* Continuous rail connecting all step nodes. */}
            <span
              aria-hidden="true"
              className="absolute bottom-6 left-[5px] top-6 w-px bg-border-strong"
            />
            {STEPS.map((step) => (
              <li key={step.n} className="relative flex gap-5 py-6 first:pt-0 last:pb-0 sm:gap-6">
                <span
                  aria-hidden="true"
                  className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-accent bg-background"
                />
                <div>
                  <p className="font-mono text-xs tracking-[0.08em] text-accent">{step.n}</p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug text-foreground">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
