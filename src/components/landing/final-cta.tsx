import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

/** Final CTA — narrative culmination. Quiz first, browse second. */
export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-4">Get matched</p>
            <h2 id="final-cta-title" className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Ready to meet your hardware?
            </h2>
            <p className="lede mt-4 max-w-xl">
              Answer a few questions about your workload. Get ranked machines with the reasoning shown.
            </p>
          </div>
          <div className="lg:col-span-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:justify-end">
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
            <p className="mt-4 font-mono text-xs text-muted lg:text-right">
              Quick match · No account
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
