import { Section } from "@/components/ui/section"
import { Badge } from "@/components/ui/badge"
import type { IllustrativeMachine } from "./illustrative-machine"
import type { WorkloadId } from "@/lib/recommend/v3/types"
import { CatalogProofView } from "./catalog-proof-view"

interface CatalogProofProps {
  machines: Record<WorkloadId, IllustrativeMachine[]>
  region: string
  currency: string
}

/** Server-rendered illustrative picks per workload — proof the catalog is real. */
export function CatalogProof({ machines, region, currency }: CatalogProofProps) {
  return (
    <Section
      id="machines"
      eyebrow="Live catalog"
      title="Real machines, real specs"
      lede="A sample from the live catalog for each workload. These are illustrative examples — your match is ranked from the full catalog."
    >
      <Badge variant="outline" className="mb-8">
        Example machines · Illustrative preview — not your ranking
      </Badge>
      <CatalogProofView machines={machines} region={region} currency={currency} />
    </Section>
  )
}
