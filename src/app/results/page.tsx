import type { Metadata } from "next"
import { getRegionFromCookies } from "@/lib/region"
import { ResultsView } from "./results-view"

export const metadata: Metadata = {
  title: "Your Laptop Recommendations — SpecWise",
  description:
    "Personalized laptop recommendations based on your quiz answers. Compare specs, prices, and retailer deals.",
}

export default async function ResultsPage() {
  const region = await getRegionFromCookies()
  return <ResultsView initialRegion={region.code} />
}
