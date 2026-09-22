import { describe, expect, it } from "vitest"
import { defaultQuizAnswers } from "@/lib/types"
import { apiBase, bearerHeaders, getJson, uniqueIp, xffHeader } from "./helpers"

/**
 * Phase 3 region boundary: supported regions pass, anything else is 400 —
 * never a silent fallback to another region's data.
 */
describe("region allowlist (API boundary)", () => {
  it("quiz: unsupported region → 400", async () => {
    const ip = uniqueIp()
    const res = await getJson<{ error: string }>(`${apiBase}/api/quiz`, {
      method: "POST",
      headers: { "content-type": "application/json", ...xffHeader(ip) },
      body: JSON.stringify({ ...defaultQuizAnswers, useCase: "general", region: "XX" }),
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe("Unsupported region")
  })

  it("quiz: supported regions accepted (incl. lowercase normalization)", async () => {
    for (const region of ["US", "IN", "us"]) {
      const ip = uniqueIp()
      const res = await getJson<{ results: unknown[]; total: number }>(`${apiBase}/api/quiz`, {
        method: "POST",
        headers: { "content-type": "application/json", ...xffHeader(ip) },
        body: JSON.stringify({ ...defaultQuizAnswers, useCase: "general", region }),
      })
      expect(res.status, `region ${region}`).toBe(200)
      expect(res.body.total).toBeGreaterThan(0)
    }
  })

  it("admin laptops: unsupported region → 400, supported → 200", async () => {
    const bad = await getJson<{ error: string }>(`${apiBase}/api/laptops?region=XX`, {
      headers: bearerHeaders(uniqueIp()),
    })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toBe("Unsupported region")

    const good = await getJson<{ laptops: unknown[] }>(`${apiBase}/api/laptops?region=IN`, {
      headers: bearerHeaders(uniqueIp()),
    })
    expect(good.status).toBe(200)
  })

  it("search: unsupported region → 400, supported → 200", async () => {
    const bad = await getJson<{ error: string }>(`${apiBase}/api/laptops/search?q=mac&region=XX`, {
      headers: xffHeader(uniqueIp()),
    })
    expect(bad.status).toBe(400)

    const good = await getJson<{ laptops: unknown[] }>(`${apiBase}/api/laptops/search?q=mac&region=GB`, {
      headers: xffHeader(uniqueIp()),
    })
    expect(good.status).toBe(200)
  })
})

describe("region cache isolation (behavioral)", () => {
  it("same quiz body in US vs IN returns region-consistent currencies", async () => {
    const body = { ...defaultQuizAnswers, useCase: "general" }
    const fetchFor = async (region: string) => {
      const res = await getJson<{ results: Array<{ currency: string; price: number }> }>(
        `${apiBase}/api/quiz`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...xffHeader(uniqueIp()) },
          body: JSON.stringify({ ...body, region }),
        }
      )
      expect(res.status).toBe(200)
      return res.body.results
    }
    const us = await fetchFor("US")
    const inn = await fetchFor("IN")
    expect(us.length).toBeGreaterThan(0)
    expect(inn.length).toBeGreaterThan(0)
    // No cross-region collision: priced results carry their request region's
    // currency (priceMissing rows default currency and are excluded), and at
    // least one price differs between regions.
    const pricedIn = inn.filter(r => r.price > 0)
    expect(pricedIn.length).toBeGreaterThan(0)
    expect(us.filter(r => r.price > 0).every(r => r.currency === "USD")).toBe(true)
    expect(pricedIn.every(r => r.currency === "INR")).toBe(true)
    expect(us.some((r, i) => inn[i] && r.price !== inn[i].price)).toBe(true)
  })
})
