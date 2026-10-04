import { WorkloadProvider } from "./workload-context"
import { Hero } from "./hero"
import { SampleProof } from "./sample-proof"
import { HowItWorks } from "./how-it-works"
import { WorkloadEntries } from "./workload-entries"
import { Trust } from "./trust"
import { FinalCta } from "./final-cta"

interface LandingPageProps {
  stats: { laptopCount: number; priceCount: number; regionCount: number }
  regionCode: string
  currency: string
}

/** Server component orchestrator for the landing page. */
export function LandingPage({ stats, regionCode, currency }: LandingPageProps) {
  return (
    <WorkloadProvider>
      <Hero />
      <SampleProof />
      <HowItWorks />
      <WorkloadEntries region={regionCode} currency={currency} />
      <Trust
        laptopCount={stats.laptopCount}
        priceCount={stats.priceCount}
        regionCount={stats.regionCount}
      />
      <FinalCta />
    </WorkloadProvider>
  )
}
