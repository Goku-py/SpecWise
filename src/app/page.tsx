import { prisma } from "@/lib/prisma"
import { getRegionFromCookies } from "@/lib/region"
import { LandingPage } from "@/components/landing/landing-page"

// Real catalog counts, computed server-side at render time — no fabricated stats.
async function getCatalogStats() {
  try {
    const [laptopCount, priceCount, regionGroups] = await Promise.all([
      prisma.laptop.count({ where: { status: "active" } }),
      prisma.laptopPrice.count(),
      prisma.laptopPrice.groupBy({ by: ["region"] }),
    ])
    return { laptopCount, priceCount, regionCount: regionGroups.length }
  } catch (e) {
    console.error("Failed to load catalog stats:", e)
    return { laptopCount: 0, priceCount: 0, regionCount: 0 }
  }
}

export default async function HomePage() {
  const [stats, region] = await Promise.all([getCatalogStats(), getRegionFromCookies()])

  return (
    <LandingPage
      stats={stats}
      regionCode={region.code}
      currency={region.currency}
    />
  )
}
