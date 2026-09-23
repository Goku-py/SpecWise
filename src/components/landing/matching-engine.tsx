import { Section } from "@/components/ui/section"
import { EvidenceFlowWrapper } from "@/components/results/evidence-flow-wrapper"

const ROWS = [
  {
    attribute: "Primary metric source",
    standard: "Sponsored reviews, affiliate rankings",
    specwise: "Full spec-sheet comparison against your workload needs",
  },
  {
    attribute: "Thermal throttling",
    standard: "Ignored or mentioned anecdotally",
    specwise: "TGP vs thermal headroom calculation",
  },
  {
    attribute: "Ranking logic",
    standard: "Commission-driven placement",
    specwise: "Weighted multi-criteria matching against your profile",
  },
  {
    attribute: "Panel quality data",
    standard: "Generic “good display” claims",
    specwise: "Resolution, refresh, gamut, and brightness from the spec sheet",
  },
]

/**
 * Methodology section: wraps the existing evidence-flow visualization plus
 * a restyled 4-row comparison table and an illustration caption. No scores.
 */
export function MatchingEngine() {
  return (
    <Section
      id="methodology"
      eyebrow="Methodology"
      title="How matching works"
      lede="Your workload becomes hardware requirements. Hardware requirements are checked against real spec sheets. Nothing is promoted, nothing is hidden."
    >
      <EvidenceFlowWrapper />
      <figure className="mt-10">
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="hairline bg-card">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Attribute</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Standard review sites</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-accent">SpecWise matching</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.attribute} className="hairline last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{row.attribute}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.standard}</td>
                  <td className="px-4 py-3 font-mono text-xs text-accent-success">{row.specwise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Illustration: how requirement-first matching differs from sponsored rankings.
        </figcaption>
      </figure>
    </Section>
  )
}
