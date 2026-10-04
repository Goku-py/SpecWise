import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { HeroLaptopWrapper } from "@/components/hero/hero-laptop-wrapper"
import { heroCatalogNote } from "./lib/catalog-note"

/** Hero — single H1 on the page. Promise left, 3D decision visual right. */
export function Hero({ machineCount }: { machineCount: number }) {
  return (
    <section aria-labelledby="hero-title" className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-success" aria-hidden="true" />
              Workload-matched laptops · {heroCatalogNote(machineCount)}
            </p>
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

          {/* 3D decision visual: lazy bundle, IO-gated, reduced-motion aware,
              static poster fallback. Illustrative, not a recommendation. */}
          <div className="lg:col-span-5">
            <HeroLaptopWrapper />
          </div>
        </div>
      </div>
    </section>
  )
}
