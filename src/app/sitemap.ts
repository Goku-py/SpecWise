import type { MetadataRoute } from "next"
import { CATEGORY_SLUGS } from "@/lib/recommend/v3/categories"
import { buildComparisonPairs, canonicalComparisonPath } from "@/lib/compare-pairs"
import { prisma } from "@/lib/prisma"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const STATIC_ROUTES = [
  "/",
  "/quiz",
  "/laptops",
  "/compare",
  "/results",
  "/about",
  "/privacy",
  "/terms",
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(path => ({
    url: new URL(path, BASE_URL).toString(),
    changeFrequency: "weekly",
    priority: 0.5,
  }))

  for (const useCase of CATEGORY_SLUGS) {
    entries.push({
      url: new URL(`/category/${useCase}`, BASE_URL).toString(),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }

  // Phase 2a: emit slug URLs (the canonical identity). Slug segments are
  // URL-safe by construction (kebab-case [a-z0-9-]); fall back to the encoded
  // legacy id for rows whose slug hasn't been backfilled.
  //
  // The same rows also feed the programmatic comparison pairs below, so this
  // stays one query. Comparison URLs MUST use legacy Laptop slugs: that is the
  // identity /compare/[slugs] resolves (see src/app/compare/[slugs]/page.tsx).
  // ponytail: source is the legacy catalog, not the Product spine — the spine
  // tables are not migrated yet (see PHASE-3 notes) and the router resolves
  // Laptop.slug. Switch to Product once the spine is migrated and dual-written.
  try {
    const laptops = await prisma.laptop.findMany({
      select: {
        id: true,
        slug: true,
        status: true,
        isPopular: true,
        reviewScore: true,
        updatedAt: true,
      },
    })

    for (const laptop of laptops) {
      entries.push({
        url: new URL(`/laptops/${laptop.slug ?? encodeURIComponent(laptop.id)}`, BASE_URL).toString(),
        lastModified: laptop.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }

    // Programmatic SEO: top same-category comparison pairs among popular
    // (fallback: top-rated) active laptops. Bounded — never the full N² grid.
    const candidates = laptops.flatMap(laptop =>
      laptop.status === "active" && laptop.slug
        ? [
            {
              slug: laptop.slug,
              // Legacy Laptop has no category column; every row is a laptop
              // (the spine models generalize this via Product.category).
              category: "LAPTOP",
              isPopular: laptop.isPopular,
              score: laptop.reviewScore,
              updatedAt: laptop.updatedAt,
            },
          ]
        : []
    )

    for (const pair of buildComparisonPairs(candidates)) {
      entries.push({
        url: new URL(canonicalComparisonPath(pair.a, pair.b), BASE_URL).toString(),
        lastModified: pair.lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
  } catch (error) {
    // Graceful fallback: static + category routes are still indexed if the
    // DB is unavailable at build/request time.
    console.error("sitemap: failed to load laptops from DB", error)
  }

  return entries
}
