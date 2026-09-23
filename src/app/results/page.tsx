import type { Metadata } from "next"
import { getRegionFromCookies } from "@/lib/region"
import { ResultsViewV3 } from "./results-view-v3"

export const metadata: Metadata = {
  title: "Your Laptop Recommendations — SpecWise",
  description:
    "Personalized laptop recommendations based on your quiz answers. Compare specs, prices, and retailer deals.",
}

export default async function ResultsPage() {
  const region = await getRegionFromCookies()
  return <ResultsViewV3 initialRegion={region.code} />
}
