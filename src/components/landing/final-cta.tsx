import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

/** Final CTA — quiz first, no account, no database browse. */
export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="border-t border-border bg-card/30 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="eyebrow mb-3">Get matched</p>
        <h2 id="final-cta-title" className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Ready to meet your hardware?
        </h2>
        <p className="lede mx-auto mb-8 max-w-xl">
          Answer a few questions about your workload. Get ranked machines with the reasoning shown.
        </p>
        <Link href="/quiz" className={buttonVariants({ size: "lg" })}>
          Find My Laptop
        </Link>
        <p className="mt-4 font-mono text-xs text-muted">Quick match · No account</p>
      </div>
    </section>
  )
}
