import Link from "next/link"
import { Section } from "@/components/ui/section"

interface TrustProps {
  laptopCount: number
  priceCount: number
  regionCount: number
}

/** Trust: affiliate firewall, earnings disclosure, and live freshness counts. */
export function Trust({ laptopCount, priceCount, regionCount }: TrustProps) {
  return (
    <Section
      id="trust"
      eyebrow="Trust"
      title="Rankings are never sold"
      lede="Matching runs on spec sheets and your workload profile. Money never touches the ranking."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Zero affiliate bias</h3>
          <p className="text-xs leading-relaxed text-muted">
            Retailer links may earn a commission, but commissions never influence which machines rank
            or in what order. The matcher never sees them.
          </p>
        </div>
        <div className="rounded border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Earnings firewall</h3>
          <p className="text-xs leading-relaxed text-muted">
            Prices are shown from real catalog offers, flagged when stale or missing — never
            fabricated, never rounded into a sales pitch.{" "}
            <Link href="/#methodology" className="underline underline-offset-2 hover:text-foreground">
              See Methodology.
            </Link>
          </p>
        </div>
        <div className="rounded border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Fresh catalog</h3>
          <p className="text-xs leading-relaxed text-muted">
            {laptopCount.toLocaleString()} machines · {priceCount.toLocaleString()} price points ·{" "}
            {regionCount.toLocaleString()} regions, checked live on every page load.
          </p>
        </div>
      </div>
    </Section>
  )
}
