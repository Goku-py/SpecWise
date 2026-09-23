import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeroLaptopWrapper } from "@/components/hero/hero-laptop-wrapper"

interface HeroProps {
  machineCount: number
}

/** Hero — copy locked. Single H1 on the page. */
export function Hero({ machineCount }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Badge variant="success" className="mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-success" aria-hidden="true" />
              Workload-matched laptops · Live catalog · {machineCount.toLocaleString()} machines
            </Badge>
            <h1 id="hero-title" className="hero-h1 mb-6">
              Match your workload to exact laptop hardware.
            </h1>
            <p className="lede mb-8 max-w-xl">
              Tell us what you run. We translate it into CPU, GPU, RAM and display requirements — then
              rank real machines. No sponsors, no promoted picks.
            </p>
            <div className="mb-8 flex min-h-11 flex-wrap items-center gap-3">
              <Link href="/quiz" className={buttonVariants({ size: "lg" })}>
                Find My Laptop
              </Link>
              <Link href="#methodology" className={buttonVariants({ variant: "outline", size: "lg" })}>
                How it works ↓
              </Link>
            </div>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-muted">
              <li>Zero affiliate bias</li>
              <li aria-hidden="true" className="text-border">|</li>
              <li>Real catalog prices</li>
              <li aria-hidden="true" className="text-border">|</li>
              <li>Quick match · No account</li>
            </ul>
          </div>
          <div className="lg:col-span-2">
            <HeroLaptopWrapper />
          </div>
        </div>
      </div>
    </section>
  )
}
