/**
 * src/lib/price-sync.ts — server-side PricesAPI client (phase 2c).
 *
 * Extracted verbatim-in-behavior from scripts/fetch-laptops.ts (offline fetch
 * script) so the /api/cron/update-prices route can reuse the exact request
 * shape, seller→region mapping and rounding semantics. The script is NOT
 * edited — it keeps its own copy; this module is the server runtime twin.
 *
 * Differences from the script (documented):
 *   - rate-limit sleep is ~1.1s between countries (cron cadence) instead of the
 *     script's conservative 11s (offline, non-interactive fetch).
 *   - per-call failures are non-fatal: a failed country is skipped; only a
 *     total failure is surfaced via `error` so callers can count it.
 *   - region config is imported from src/lib/regions.ts (single source of
 *     truth) instead of a duplicated constant.
 */

import { REGIONS } from "@/lib/regions"

/** Normalized offer, already mapped to a SpecWise region + retailer label. */
export interface PriceOffer {
  region: string
  retailer: string
  currency: string
  /** WHOLE currency units (major units), rounded — matches LaptopPrice.price. */
  price: number
  url: string | null
}

export interface LaptopIdentity {
  brand: string
  model: string
  variant: string | null
}

export interface OffersResult {
  offers: PriceOffer[]
  /**
   * Non-null when the API was configured but the request failed for every
   * country (key missing → `error` stays null: that is a documented skip, not
   * a failure). Callers count this against the run's `errors`.
   */
  error: string | null
}

export interface FetchOffersOptions {
  /** Sleep between country calls (default ~1.1s). */
  rateLimitMs?: number
  /** Per-request timeout (default 95s — PricesAPI cold calls take 30-90s). */
  timeoutMs?: number
}

/** Countries probed, in the same order as the offline script. */
const COUNTRIES = ["us", "gb", "de", "ca", "au", "in"] as const

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Seller → region mapping (mirrors scripts/fetch-laptops.ts) ──────────────

function sellerRegion(seller: string, currency: string): string | null {
  const s = seller.toLowerCase()
  for (const r of REGIONS) {
    if (s === "amazon") {
      return (
        currency === "INR" ? "IN" :
        currency === "GBP" ? "GB" :
        currency === "EUR" ? "DE" :
        currency === "CAD" ? "CA" :
        currency === "AUD" ? "AU" :
        currency === "USD" ? "US" : null
      )
    }
    if (r.retailers.some(ret => ret.toLowerCase() === s)) return r.code
  }
  return null
}

function regionForCurrency(currency: string): string | null {
  return REGIONS.find(r => r.currency === currency)?.code ?? null
}

// ── PricesAPI search (same endpoint + shape as the offline script) ─────────

interface RawOffer {
  seller: string
  price: number
  currency: string
  url?: string | null
}

async function searchPricesAPI(
  query: string,
  country: string,
  timeoutMs: number
): Promise<RawOffer[] | null> {
  const apiKey = process.env.PRICESAPI_API_KEY
  if (!apiKey) return null

  const url = `https://api.pricesapi.io/api/v1/products/search?q=${encodeURIComponent(query)}&country=${country}&limit=3&offers_limit=5`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) return null // 404 = "no offers", other codes = "skip country"
  const json = (await res.json()) as { data?: { products?: Array<{ offers?: RawOffer[] }> } }
  const products = json?.data?.products ?? []
  if (products.length === 0) return null
  const offers = products[0].offers ?? []
  return offers.map(o => ({ seller: o.seller, price: o.price, currency: o.currency, url: o.url ?? null }))
}

/**
 * Fetches + normalizes offers for one laptop across all probe countries.
 * Never throws: per-country failures are skipped; a fully failed run is
 * surfaced via `error`. Returns an empty offer list when PRICESAPI_API_KEY is
 * not configured (documented skip — mirroring the offline script).
 */
export async function fetchOffersForLaptop(
  laptop: LaptopIdentity,
  opts: FetchOffersOptions = {}
): Promise<OffersResult> {
  if (!process.env.PRICESAPI_API_KEY) {
    return { offers: [], error: null }
  }

  const query = [laptop.brand, laptop.model, laptop.variant].filter(Boolean).join(" ")
  const rateLimitMs = opts.rateLimitMs ?? 1100
  const timeoutMs = opts.timeoutMs ?? 95000

  const offers: PriceOffer[] = []
  let countryFailures = 0

  for (const [index, country] of COUNTRIES.entries()) {
    if (index > 0) await sleep(rateLimitMs)
    try {
      const raw = await searchPricesAPI(query, country, timeoutMs)
      if (!raw) {
        countryFailures++
        continue
      }
      for (const offer of raw) {
        const region =
          offer.seller.toLowerCase() === "amazon"
            ? regionForCurrency(offer.currency) ?? country.toUpperCase()
            : sellerRegion(offer.seller, offer.currency) ?? regionForCurrency(offer.currency) ?? country.toUpperCase()

        // Map the seller to the region's configured retailer label ("Amazon",
        // "JB Hi-Fi", …) so it can match existing LaptopPrice rows; unknown
        // sellers keep their raw name and simply won't match any row.
        const regionConfig = REGIONS.find(r => r.code === region)
        const retailer =
          regionConfig?.retailers.find(r => r.toLowerCase() === offer.seller.toLowerCase()) ??
          offer.seller

        offers.push({
          region,
          retailer,
          currency: offer.currency.toUpperCase(),
          price: Math.round(offer.price),
          url: offer.url ?? null,
        })
      }
    } catch {
      // fetch threw (network/timeout/parse) — non-fatal, skip this country.
      countryFailures++
    }
  }

  const totalFailure =
    countryFailures === COUNTRIES.length && offers.length === 0
      ? "PricesAPI request failed for all countries"
      : null

  return { offers, error: totalFailure }
}
