import type { WorkloadId } from "@/lib/recommend/v3/types"
import type { IllustrativeMachine } from "./illustrative-machine"
import { WorkloadProvider } from "./workload-context"
import { Hero } from "./hero"
import { WorkloadExperience } from "./workload-experience"
import { HardwareStrip } from "./hardware-strip"
import { MatchingEngine } from "./matching-engine"
import { CatalogProof } from "./catalog-proof"
import { Trust } from "./trust"
import { FinalCta } from "./final-cta"

interface LandingPageProps {
  stats: { laptopCount: number; priceCount: number; regionCount: number }
  machines: Record<WorkloadId, IllustrativeMachine[]>
  regionCode: string
  currency: string
}

/** Server component orchestrator for the P0 landing page. */
export function LandingPage({ stats, machines, regionCode, currency }: LandingPageProps) {
  return (
    <WorkloadProvider>
      <Hero machineCount={stats.laptopCount} />
      <WorkloadExperience region={regionCode} currency={currency} />
      <HardwareStrip />
      <MatchingEngine />
      <CatalogProof machines={machines} region={regionCode} currency={currency} />
      <Trust
        laptopCount={stats.laptopCount}
        priceCount={stats.priceCount}
        regionCount={stats.regionCount}
      />
      <FinalCta />
    </WorkloadProvider>
  )
}
