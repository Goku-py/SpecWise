/**
 * src/lib/affiliate.ts — affiliate / purchase-link resolution (phase 2c).
 *
 * Pure, server-safe URL resolution for retailer purchase links. Single source
 * of truth for how a "Buy" / "View Deal" href is built; everything that renders
 * a retailer link should go through buildAffiliateUrl() so that when affiliate
 * programs go live, ONE module changes instead of every component.
 *
 * Resolution order (first non-empty result wins):
 *   1. affiliateUrl  — a signed partner URL already stored on the price row
 *      (highest priority; never override a signed link).
 *   2. Per-retailer override — RETAILER_LINK_OVERRIDES[retailer], the ONLY
 *      place retailer-specific link quirks will ever be added (empty today).
 *   3. linkTemplate  — retailer master-data template with placeholders applied
 *      ({url}, {asin}, {model}, plus any extra vars). All rows have NULL
 *      templates today, so this path is latent. If a placeholder cannot be
 *      resolved the template is abandoned (returns null → falls through).
 *   4. url           — plain retailer URL.
 *   5. null          — callers render nothing (BuyButton returns null).
 */

/** FTC disclosure: every outbound retail link is a potential affiliate link. */
export const AFFILIATE_REL = "noopener noreferrer sponsored"

/** Extra values substituted into linkTemplate placeholders ({model}, …). */
export interface AffiliateLinkVars {
  model?: string
  [key: string]: string | undefined
}

export interface AffiliateUrlInput {
  /** Signed partner URL stored on LaptopPrice.affiliateUrl. */
  affiliateUrl?: string | null
  /** Retailer.linkTemplate from master data (NULL today for all retailers). */
  linkTemplate?: string | null
  /** Plain retailer URL stored on LaptopPrice.url. */
  url?: string | null
  /** Retailer code (e.g. "amazon") — key for RETAILER_LINK_OVERRIDES. */
  retailer?: string | null
  /** Placeholder values (model, …) known by the caller. */
  vars?: AffiliateLinkVars
}

/**
 * A per-retailer link quirk. Receives the plain url + vars; returns the final
 * href or null to fall through to linkTemplate/url. Additive registry — see
 * RETAILER_LINK_OVERRIDES.
 */
export type RetailerLinkOverride = (input: {
  url?: string
  vars: AffiliateLinkVars
}) => string | null

/**
 * Per-retailer link overrides. EMPTY registry, keyed by Retailer.code.
 *
 * THIS IS THE ONLY PLACE RETAILER QUIRKS WILL EVER BE ADDED (e.g. "amazon":
 * append a tracking tag to the url once the affiliate program is live).
 * Never add quirk logic anywhere else — keep components dumb.
 */
export const RETAILER_LINK_OVERRIDES: Record<string, RetailerLinkOverride> = {}

/**
 * Extracts an Amazon-style 10-char ASIN from a product URL, or null.
 * Used to fill the {asin} linkTemplate placeholder.
 */
export function extractAsin(url: string): string | null {
  const m = url.match(/(?:[/](?:dp|gp[/]product|asin)[/])([A-Z0-9]{10})(?:[/?]|$)/i)
  return m?.[1] ?? null
}

/**
 * Applies {url}, {asin}, {model} (and any vars) to a linkTemplate. Returns
 * null when a placeholder remains unresolvable — callers then fall through to
 * the plain url instead of emitting a malformed link.
 */
function applyLinkTemplate(template: string, url: string, vars: AffiliateLinkVars): string | null {
  const asin = extractAsin(url)
  let out = template
  out = out.replaceAll("{url}", encodeURIComponent(url))
  out = out.replaceAll("{asin}", asin ? encodeURIComponent(asin) : "{asin}")
  for (const [key, value] of Object.entries(vars)) {
    if (value) out = out.replaceAll(`{${key}}`, encodeURIComponent(value))
  }
  // Any placeholder left means we lack the data — refuse the template.
  if (/{[a-z0-9_-]+}/i.test(out)) return null
  return out
}

/**
 * Resolves the final purchase href for a retailer price row.
 * Pure: no env access, no I/O — trivially unit-testable.
 *
 * Returns null when nothing usable is available (caller renders no link).
 */
export function buildAffiliateUrl(input: AffiliateUrlInput): string | null {
  const { affiliateUrl, linkTemplate, url, retailer, vars = {} } = input

  // 1. Signed partner URL always wins.
  if (affiliateUrl) return affiliateUrl

  // 2. Retailer quirk (registry is additive; empty today).
  if (retailer) {
    const quirk = RETAILER_LINK_OVERRIDES[retailer]
    if (quirk) {
      const overridden = quirk({ url: url ?? undefined, vars })
      if (overridden) return overridden
    }
  }

  // 3. Template with placeholders; abandoned if unresolvable.
  if (linkTemplate && url) {
    const applied = applyLinkTemplate(linkTemplate, url, vars)
    if (applied) return applied
  }

  // 4. Plain URL (falsy/empty → null so callers never link to garbage).
  return url || null
}
