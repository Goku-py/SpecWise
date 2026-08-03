import { describe, expect, it } from "vitest"
import { apiBase, bearerHeaders, getJson, uniqueIp, xffHeader } from "./helpers"

interface LaptopListResponse {
  laptops: Array<{ id: string }>
  total: number
  page: number
  pageSize: number
}

interface ErrorResponse {
  error: string
}

const ip = uniqueIp()

describe("admin auth (Bearer key)", () => {
  it("GET /api/laptops without a key → 401", async () => {
    const res = await getJson<ErrorResponse>(`${apiBase}/api/laptops?region=US`, {
      headers: xffHeader(ip),
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("Unauthorized")
  })

  it("GET /api/laptops with a bogus key → 401", async () => {
    const res = await getJson<ErrorResponse>(`${apiBase}/api/laptops?region=US`, {
      headers: { authorization: "Bearer not-the-real-key-123", ...xffHeader(ip) },
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("Unauthorized")
  })

  it("GET /api/laptops with a valid key but no region → 400 (region is required)", async () => {
    const res = await getJson<ErrorResponse>(`${apiBase}/api/laptops`, {
      headers: bearerHeaders(ip),
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe("Missing required query param: region")
  })

  it("GET /api/laptops?region=US with a valid key → 200 with laptops", async () => {
    const res = await getJson<LaptopListResponse>(
      `${apiBase}/api/laptops?region=US&page=1&pageSize=20`,
      { headers: bearerHeaders(ip) }
    )

    expect(res.status).toBe(200)
    // Total is data-driven (the seed may grow); assert the pagination contract,
    // not a hardcoded count.
    expect(res.body.total).toBeGreaterThanOrEqual(56)
    expect(res.body.page).toBe(1)
    expect(res.body.pageSize).toBe(20)
    expect(res.body.laptops.length).toBe(20)
    for (const laptop of res.body.laptops) {
      expect(laptop.id.length).toBeGreaterThan(0)
    }
  })

  it("PATCH /api/laptops/[id] without a key → 401 (real id from search)", async () => {
    const search = await getJson<{ laptops: Array<{ id: string }> }>(
      `${apiBase}/api/laptops/search?q=mac`,
      { headers: xffHeader(ip) }
    )
    expect(search.status).toBe(200)
    expect(search.body.laptops.length).toBeGreaterThan(0)
    const realId = search.body.laptops[0].id

    const res = await getJson<ErrorResponse>(`${apiBase}/api/laptops/${realId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...xffHeader(ip) },
      body: JSON.stringify({ notes: "should be rejected" }),
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("Unauthorized")
  })

  it("POST /api/admin/import without a key → 401", async () => {
    const res = await getJson<ErrorResponse>(`${apiBase}/api/admin/import`, {
      method: "POST",
      headers: { "content-type": "application/json", ...xffHeader(ip) },
      body: JSON.stringify({ laptops: [] }),
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("Unauthorized")
  })

  it("POST /api/admin/revalidate without a key → 401", async () => {
    const res = await getJson<ErrorResponse>(`${apiBase}/api/admin/revalidate`, {
      method: "POST",
      headers: xffHeader(ip),
    })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe("Unauthorized")
  })

  it("POST /api/admin/import with a valid key but empty laptops → 400", async () => {
    const res = await getJson<ErrorResponse>(`${apiBase}/api/admin/import`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearerHeaders(ip) },
      body: JSON.stringify({ laptops: [] }),
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe("laptops must not be empty")
  })

  it("POST /api/admin/revalidate with a valid key → 200 {ok:true}", async () => {
    const res = await getJson<{ ok: boolean }>(`${apiBase}/api/admin/revalidate`, {
      method: "POST",
      headers: bearerHeaders(ip),
    })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
