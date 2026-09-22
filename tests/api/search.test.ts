import { describe, expect, it } from "vitest"
import { apiBase, getJson, uniqueIp, xffHeader } from "./helpers"

interface SearchItem {
  id: string
  brand: string
  model: string
}

async function search(q: string, extra = "") {
  const res = await getJson<{ laptops: SearchItem[] }>(
    `${apiBase}/api/laptops/search?q=${encodeURIComponent(q)}${extra}`,
    { headers: xffHeader(uniqueIp()) }
  )
  expect(res.status).toBe(200)
  return res.body.laptops
}

/**
 * Phase 3: trigram similarity ranking (threshold > 0.15, limit 20) with
 * `contains` fallback. Live dev catalog: Apple MacBook rows exist.
 */
describe("search (trigram + fallback)", () => {
  it("exact match returns relevant rows first", async () => {
    const laptops = await search("MacBook")
    expect(laptops.length).toBeGreaterThan(0)
    expect(`${laptops[0].brand} ${laptops[0].model}`.toLowerCase()).toContain("macbook")
  })

  it("near/typo match still finds the laptop", async () => {
    const laptops = await search("MacBok")
    expect(laptops.length).toBeGreaterThan(0)
    expect(`${laptops[0].brand} ${laptops[0].model}`.toLowerCase()).toContain("macbook")
  })

  it("gibberish falls back to contains and returns empty (200, no crash)", async () => {
    const laptops = await search("zzz-no-such-laptop")
    expect(laptops).toEqual([])
  })

  it("results never exceed 20 rows", async () => {
    const laptops = await search("an")
    expect(laptops.length).toBeLessThanOrEqual(20)
  })

  it("ordering is deterministic across identical requests", async () => {
    const first = (await search("MacBook")).map(l => l.id)
    const second = (await search("MacBook")).map(l => l.id)
    expect(second).toEqual(first)
  })
})
