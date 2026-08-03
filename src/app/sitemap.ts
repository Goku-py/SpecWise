import type { MetadataRoute } from "next"
import { USE_CASE_LABELS } from "@/lib/questions"
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
  }))

  for (const useCase of Object.keys(USE_CASE_LABELS)) {
    entries.push({
      url: new URL(`/category/${useCase}`, BASE_URL).toString(),
    })
  }

  // Phase 2a: emit slug URLs (the canonical identity). Slug segments are
  // URL-safe by construction (kebab-case [a-z0-9-]); fall back to the encoded
  // legacy id for rows whose slug hasn't been backfilled.
  try {
    const laptops = await prisma.laptop.findMany({
      select: { id: true, slug: true, updatedAt: true },
    })
    for (const laptop of laptops) {
      entries.push({
        url: new URL(`/laptops/${laptop.slug ?? encodeURIComponent(laptop.id)}`, BASE_URL).toString(),
        lastModified: laptop.updatedAt,
      })
    }
  } catch (error) {
    // Graceful fallback: static + category routes are still indexed if the
    // DB is unavailable at build/request time.
    console.error("sitemap: failed to load laptop ids from DB", error)
  }

  return entries
}
