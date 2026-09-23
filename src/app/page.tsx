import { prisma } from "@/lib/prisma"
import { getActiveCatalog, toScorable } from "@/lib/catalog-cache"
import { getRegionFromCookies } from "@/lib/region"
import { LandingPage } from "@/components/landing/landing-page"
import { resolveIllustrativeMachines, emptyIllustrativeMachines } from "@/components/landing/data/illustrative-picks"
import type { ScorableLaptopWithSlug } from "@/components/landing/illustrative-machine"

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

  let machines = emptyIllustrativeMachines()
  try {
    const rawCatalog = await getActiveCatalog(region.code)
    const scorable: ScorableLaptopWithSlug[] = rawCatalog.map((l) => ({
      ...toScorable(l, region.code),
      slug: l.slug,
    }))
    machines = resolveIllustrativeMachines(scorable)
  } catch (e) {
    console.error("Failed to resolve illustrative machines:", e)
  }

  return (
    <LandingPage
      stats={stats}
      machines={machines}
      regionCode={region.code}
      currency={region.currency}
    />
  )
}
