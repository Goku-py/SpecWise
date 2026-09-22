import { describe, expect, it } from "vitest"
import { apiBase, getJson, uniqueIp, xffHeader } from "./helpers"

interface SearchItem {
  id: string
  slug: string | null
  brand: string
  model: string
  price: number | null
  currency: string
}

interface JsonLdOffer {
  "@type": string
  priceCurrency: string
  price: number
  availability: string
  priceValidUntil?: string
}

function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(m[1])
      if (Array.isArray(parsed)) out.push(...(parsed as Array<Record<string, unknown>>))
      else if (parsed && typeof parsed === "object") out.push(parsed as Record<string, unknown>)
    } catch {
      // Ignore unparseable blocks; the Product block is asserted below.
    }
  }
  return out
}

/**
 * Phase 3: structured data prices the SAME region the visible UI prices
 * (request region; default US) — never another region's lowest price.
 */
describe("JSON-LD regional parity", () => {
  it("Product offer matches the US search price, currency, and availability", async () => {
    const search = await getJson<{ laptops: SearchItem[] }>(
      `${apiBase}/api/laptops/search?q=MacBook&region=US`,
      { headers: xffHeader(uniqueIp()) }
    )
    expect(search.status).toBe(200)
    const item = search.body.laptops.find(l => l.slug && l.price != null)
    expect(item).toBeDefined()

    const page = await fetch(`${apiBase}/laptops/${item!.slug}`, {
      headers: xffHeader(uniqueIp()),
    })
    expect(page.status).toBe(200)
    const blocks = extractJsonLd(await page.text())
    const product = blocks.find(b => b["@type"] === "Product") as
      | { offers?: JsonLdOffer; url?: string }
      | undefined
    expect(product).toBeDefined()
    expect(product!.url).toContain(`/laptops/${item!.slug}`)
    const offer = product!.offers
    expect(offer).toBeDefined()
    // Same region (US), same cheapest-valid offer as the search API.
    expect(offer!.priceCurrency).toBe("USD")
    expect(offer!.price).toBe(item!.price)
    expect(offer!.availability).toBe("https://schema.org/InStock")
    // Seed data has no expiries: no validity date emitted, never fabricated.
    expect(offer!.priceValidUntil).toBeUndefined()
  })
})
