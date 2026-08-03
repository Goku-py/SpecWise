import type { Metadata } from "next"
import { Suspense } from "react"
import { getRegionFromCookies } from "@/lib/region"
import { CompareContent } from "./compare-content"

export const metadata: Metadata = {
  title: "Compare Laptops — SpecWise",
  description:
    "Side-by-side comparison of laptops from your recommendations: specs, prices, and trade-offs.",
}

export default async function ComparePage() {
  // Region is read for consistency with the other shells; CompareContent itself
  // is region-agnostic (it renders stored results as-is).
  await getRegionFromCookies()
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading...</div>}>
      <CompareContent />
    </Suspense>
  )
}
