import { describe, expect, it } from "vitest"
import { apiBase, getJson } from "./helpers"

interface HealthResponse {
  status: string
  timestamp?: string
  uptime?: number
}

describe("GET /api/health", () => {
  it("returns 200 with status ok while the DB is reachable", async () => {
    const res = await getJson<HealthResponse>(`${apiBase}/api/health`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe("ok")
  })
})
