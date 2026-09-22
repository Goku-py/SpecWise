import { NextResponse } from "next/server"
import { withLogging } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"
import { isSupportedRegion } from "@/lib/regions"

/** Phase 3: trigram similarity floor (uses the GIN index from migration 20260707150000).
 * Measured 2026-09-22 on the live catalog: exact "MacBook" → 0.421, typo
 * "MacBok" → 0.300, gibberish-with-real-word "zzz-no-such-laptop" → 0.243,
 * short "pro" → 0.174. Floor 0.25 keeps typo tolerance while preserving the
 * existing empty-state contract for unknown queries (short substrings still
 * resolve via the `contains` fallback). */
export const SEARCH_SIMILARITY_THRESHOLD = 0.25;
/** Phase 3: hard cap on ranked search results. */
export const SEARCH_RESULT_LIMIT = 20;

/** Collapse whitespace for stable trigram matching. */
export function normalizeSearchQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Ranked laptop ids by trigram similarity over "brand model", or null when
 * the trigram path yields nothing (caller falls back to `contains`).
 * Fully parameterized — q never interpolates into SQL text.
 */
export async function trigramSearchIds(rawQuery: string): Promise<string[] | null> {
  const q = normalizeSearchQuery(rawQuery);
  if (q.length < 2) return null;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Laptop"
    WHERE status = 'active'
      AND similarity(lower(brand || ' ' || model), ${q}) > ${SEARCH_SIMILARITY_THRESHOLD}
    ORDER BY similarity(lower(brand || ' ' || model), ${q}) DESC, id ASC
    LIMIT ${SEARCH_RESULT_LIMIT}`;
  return rows.length > 0 ? rows.map(r => r.id) : null;
}

export const GET = withLogging(async (request) => {
  // Public, per-keystroke DB queries — cap at 60 requests/minute/IP (same as /api/quiz)
  const ip = getClientIP(request)
  const rateLimit = await checkRateLimit(`search-laptops:${ip}`, 60, 60)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const rawRegion = searchParams.get("region")?.trim() || undefined
  // Phase 3: unknown regions 400 — never silently fall back to another region.
  if (rawRegion !== undefined && !isSupportedRegion(rawRegion)) {
    return NextResponse.json({ error: "Unsupported region" }, { status: 400 })
  }
  const region = rawRegion?.toUpperCase()

  // Phase 3: trigram similarity ranking first (typo-tolerant), `contains`
  // fallback when it yields nothing (preserves old matching behavior).
  const rankedIds = q ? await trigramSearchIds(q) : null

  const laptops = await prisma.laptop.findMany({
    where: {
      status: "active",
      ...(rankedIds
        ? { id: { in: rankedIds } }
        : q && q.length >= 2
          ? {
              OR: [
                { brand: { contains: q, mode: "insensitive" } },
                { model: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
    },
    include: {
      prices: {
        where: region ? { region } : undefined,
        select: { region: true, retailer: true, currency: true, price: true, url: true, affiliateUrl: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: { isPopular: "desc" },
    // Phase 3: searched queries are capped at SEARCH_RESULT_LIMIT in every
    // path (trigram ids are already ≤ limit). Empty-q browse is uncapped.
    take: q && q.length >= 2 ? SEARCH_RESULT_LIMIT : undefined,
  })

  const enriched = laptops.map(l => ({
    id: l.id,
    slug: l.slug,
    brand: l.brand,
    model: l.model,
    variant: l.variant,
    os: l.os,
    cpuBrand: l.cpuBrand,
    cpuFamily: l.cpuFamily,
    cpuCores: l.cpuCores,
    gpuType: l.gpuType,
    gpuModel: l.gpuModel,
    ramAmount: l.ramAmount,
    storageAmount: l.storageAmount,
    storageType: l.storageType,
    displaySize: l.displaySize,
    displayResolution: l.displayResolution,
    displayRefreshRate: l.displayRefreshRate,
    weight: l.weight,
    batteryLife: l.batteryLife,
    imageUrl: l.imageUrl,
    reviewScore: l.reviewScore,
    isPopular: l.isPopular,
    price: l.prices[0]?.price ?? null,
    currency: l.prices[0]?.currency ?? "USD",
  }))

  // findMany with `in` does not preserve similarity order — restore it.
  const order = rankedIds ? new Map(rankedIds.map((id, i) => [id, i])) : null
  if (order) enriched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  return NextResponse.json({ laptops: enriched })
})
