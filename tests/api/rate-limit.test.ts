import { describe, expect, it } from "vitest"
import { defaultQuizAnswers } from "@/lib/types"
import type { QuizAnswers } from "@/lib/types"
import { alignRateLimitWindow, apiBase, getJson, uniqueIp, xffHeader } from "./helpers"

interface RateLimitErrorResponse {
  error: string
}

/**
 * Rate limits live in per-IP, fixed-60s-window buckets in the dev DB
 * (RateLimit table). Every suite uses its own unique X-Forwarded-For value so
 * real users' buckets are never touched.
 *
 * Verified limits (from src/lib/rate-limit.ts call sites): search 60/min,
 * quiz 60/min, PATCH 30/min, import 30/min. `allowed` is `count <= limit`, so
 * with a limit of 60 the 61st request in a window is the first 429.
 */
describe("rate limits (per-IP, 60s window)", () => {
  it("search: the 61st GET from one IP returns 429 with Retry-After", async () => {
    const ip = uniqueIp()
    await alignRateLimitWindow()

    const statuses: number[] = []
    let retryAfter: string | null = null
    let limitBody: unknown

    for (let i = 0; i < 61; i++) {
      const res = await getJson(`${apiBase}/api/laptops/search?q=mac`, {
        headers: xffHeader(ip),
      })
      statuses.push(res.status)
      if (res.status === 429) {
        if (retryAfter === null) retryAfter = res.headers.get("retry-after")
        if (limitBody === undefined) limitBody = res.body
      }
    }

    expect(statuses[0]).toBe(200)
    expect(statuses[60]).toBe(429)
    expect(statuses.filter(s => s === 200).length).toBe(60)
    expect(retryAfter).toBe("60")
    expect(limitBody).toEqual({ error: "Rate limit exceeded" } satisfies RateLimitErrorResponse)
  }, 120_000)

  it("quiz: the 61st POST from one IP returns 429 with Retry-After", async () => {
    const ip = uniqueIp()
    await alignRateLimitWindow()

    const answers: QuizAnswers = { ...defaultQuizAnswers, useCase: "general" }
    const statuses: number[] = []
    let retryAfter: string | null = null
    let limitBody: unknown

    for (let i = 0; i < 61; i++) {
      const res = await getJson(`${apiBase}/api/quiz`, {
        method: "POST",
        headers: { "content-type": "application/json", ...xffHeader(ip) },
        body: JSON.stringify(answers),
      })
      statuses.push(res.status)
      if (res.status === 429) {
        if (retryAfter === null) retryAfter = res.headers.get("retry-after")
        if (limitBody === undefined) limitBody = res.body
      }
    }

    expect(statuses[0]).toBe(200)
    expect(statuses[60]).toBe(429)
    expect(statuses.filter(s => s === 200).length).toBe(60)
    expect(retryAfter).toBe("60")
    expect(limitBody).toEqual({ error: "Rate limit exceeded" } satisfies RateLimitErrorResponse)
  }, 120_000)

  it("a third IP is unaffected by the other buckets (isolation)", async () => {
    const ip = uniqueIp()

    const res = await getJson(`${apiBase}/api/laptops/search?q=mac`, {
      headers: xffHeader(ip),
    })

    expect(res.status).toBe(200)
    const body = res.body as { laptops: unknown[] }
    expect(Array.isArray(body.laptops)).toBe(true)
  })
})
