import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { invalidateCatalogCache } from "@/lib/catalog-cache"
import { upsertLaptopPrice } from "@/lib/db/catalog"
import { fetchOffersForLaptop } from "@/lib/price-sync"
import { verifyBearerToken } from "@/lib/cron-auth"

/**
 * GET /api/cron/update-prices — price-sync cron (phase 2c, final sub-lane).
 *
 * Per run (idempotent batching):
 *   1. Selects `PRICE_SYNC_BATCH` (default 5) ACTIVE laptops with NO
 *      PriceSnapshot captured in the last 24h, oldest updatedAt first.
 *   2. For each selected laptop:
 *        a. ALWAYS snapshots every current LaptopPrice row first
 *           (PriceSnapshot.priceCents = LaptopPrice.price × 100).
 *        b. Fetches fresh offers from PricesAPI (src/lib/price-sync.ts,
 *           ~1.1s rate-limit sleep between countries, per-call timeout,
 *           non-fatal on error).
 *        c. For each offer matching an EXISTING (laptop, region, retailer)
 *           LaptopPrice row whose retailer resolves to a known Retailer code,
 *           upserts that row's price/url through the catalog write layer
 *           (catalog.ts, whole units). NEVER creates new LaptopPrice rows.
 *        d. If PRICE_SYNC_APPLY === "false" → skip step (c): snapshot-only
 *           mode (prices recorded, LaptopPrice untouched). Any other value or
 *           unset → apply.
 *   3. After the batch: one catalog invalidation (replicates catalog.ts
 *      invalidateAfterWrite, which is not exported).
 *
 * Auth: CRON_SECRET set → `Authorization: Bearer <secret>` required
 * (crypto.timingSafeEqual, same pattern as src/lib/admin-auth.ts).
 * CRON_SECRET unset + NODE_ENV=production → 403. Dev always allows.
 *
 * Returns { processed, snapshotsWritten, pricesUpdated, errors, skippedFresh, mode }.
 */

export const dynamic = "force-dynamic"

/** 24h freshness window — laptops snapshotted within this are skipped. */
const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000

function batchSize(): number {
  const raw = Number(process.env.PRICE_SYNC_BATCH ?? 5)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5
}

/** PRICE_SYNC_APPLY=false switches to snapshot-only; everything else applies. */
function shouldApply(): boolean {
  return process.env.PRICE_SYNC_APPLY !== "false"
}

/**
 * Replicates catalog.ts invalidateAfterWrite() (single invalidation per batch;
 * the helper is private there). Inside the Next runtime these calls never
 * throw in practice; if they do, the writes have already committed — log and
 * continue, never fail the cron for a cache hiccup.
 */
function invalidateCatalogAfterBatch() {
  try {
    invalidateCatalogCache()
    revalidatePath("/")
    revalidatePath("/laptops")
    revalidatePath("/laptops/[id]", "page")
    revalidatePath("/laptops/[slug]", "page")
    revalidatePath("/category/[useCase]", "page")
    revalidatePath("/admin")
  } catch (err) {
    console.error("update-prices: catalog invalidation error (writes already committed):", err)
  }
}

export async function GET(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    if (!verifyBearerToken(request, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; refusing to run the price-sync cron in production" },
      { status: 403 }
    )
  }
  // Dev (NODE_ENV !== production) without CRON_SECRET → always allowed.

  const batch = batchSize()
  const apply = shouldApply()
  const freshSince = new Date(Date.now() - FRESH_WINDOW_MS)

  try {
    // ── Batch selection: active laptops without a snapshot in the last 24h ─
    const freshRows = await prisma.priceSnapshot.findMany({
      where: { capturedAt: { gte: freshSince } },
      select: { laptopId: true },
      distinct: ["laptopId"],
      orderBy: { laptopId: "asc" },
    })
    const freshIds = new Set(freshRows.map(r => r.laptopId))
    const skippedFresh = await prisma.laptop.count({
      where: { status: "active", id: { in: [...freshIds] } },
    })

    const laptops = await prisma.laptop.findMany({
      where: freshIds.size > 0
        ? { status: "active", id: { notIn: [...freshIds] } }
        : { status: "active" },
      orderBy: { updatedAt: "asc" }, // oldest updatedAt first
      take: batch,
      select: { id: true, brand: true, model: true, variant: true },
    })

    // Retailer master data once per run: name OR code → row (LaptopPrice rows
    // store display names like "Amazon"/"JB Hi-Fi"; Retailer.code is the slug).
    const retailerRows = await prisma.retailer.findMany({
      select: { code: true, name: true, linkTemplate: true },
    })
    const retailerByName = new Map(retailerRows.map(r => [r.name, r]))
    const retailerByCode = new Map(retailerRows.map(r => [r.code, r]))

    let snapshotsWritten = 0
    let pricesUpdated = 0
    let errors = 0

    for (const laptop of laptops) {
      try {
        // (a) Snapshot ALL current price rows first (ALWAYS, both modes).
        const current = await prisma.laptopPrice.findMany({
          where: { laptopId: laptop.id },
          select: { region: true, retailer: true, currency: true, price: true, url: true, affiliateUrl: true },
        })
        if (current.length > 0) {
          const now = new Date()
          const created = await prisma.priceSnapshot.createMany({
            data: current.map(p => ({
              laptopId: laptop.id,
              retailer: p.retailer,
              region: p.region,
              priceCents: p.price * 100, // major → minor units
              currency: p.currency,
              inStock: true,
              capturedAt: now,
            })),
          })
          snapshotsWritten += created.count
        }

        // (b) Fetch fresh offers (non-fatal; API failures never abort the run).
        const { offers, error } = await fetchOffersForLaptop({
          brand: laptop.brand,
          model: laptop.model,
          variant: laptop.variant,
        })
        if (error && offers.length === 0) {
          errors += 1
          console.error(`update-prices: ${error} for laptop ${laptop.id} (${laptop.brand} ${laptop.model})`)
          continue
        }

        // (c) Apply mode: upsert matching rows through catalog.ts.
        if (apply) {
          const existingKeys = new Set(current.map(p => `${p.region}|${p.retailer}`))
          for (const offer of offers) {
            // Must match an EXISTING (laptop, region, retailer) price row…
            if (!existingKeys.has(`${offer.region}|${offer.retailer}`)) continue
            // …AND the retailer must resolve to a known Retailer row.
            const retailer =
              retailerByName.get(offer.retailer) ?? retailerByCode.get(offer.retailer)
            if (!retailer) continue

            const result = await upsertLaptopPrice({
              laptopId: laptop.id,
              region: offer.region,
              retailer: offer.retailer,
              price: offer.price, // whole units — already rounded by price-sync
              currency: offer.currency,
              url: offer.url,
              affiliateUrl: null, // offers carry no signed partner URL
            })
            if (result.ok) pricesUpdated += 1
          }
        }
      } catch (err) {
        errors += 1
        console.error(`update-prices: laptop ${laptop.id} (${laptop.brand} ${laptop.model}) failed:`, err)
      }
    }

    // ── Single invalidation after the whole batch ─────────────────────────
    invalidateCatalogAfterBatch()

    return NextResponse.json({
      processed: laptops.length,
      snapshotsWritten,
      pricesUpdated,
      errors,
      skippedFresh,
      mode: apply ? "apply" : "snapshot-only",
    })
  } catch (err) {
    console.error("update-prices: fatal run error:", err)
    return NextResponse.json({ error: "Price sync failed" }, { status: 500 })
  }
}
