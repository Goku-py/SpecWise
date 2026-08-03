import { describe, expect, it } from "vitest"
import { defaultQuizAnswers } from "@/lib/types"
import type { QuizAnswers } from "@/lib/types"
import { apiBase, getJson, uniqueIp, xffHeader } from "./helpers"
import type { ApiResponse } from "./helpers"

interface QuizResult {
  id: string
  brand: string
  model: string
  variant: string | null
  matchScore: number
  matchReasons: string[]
  tradeoffs: string[]
}

interface QuizResponse {
  results: QuizResult[]
  total: number
}

interface QuizErrorResponse {
  error: string
  issues?: string[]
}

/**
 * Route contract surprise: defaultQuizAnswers.useCase is `null`, but
 * QuizAnswersSchema declares useCase as a REQUIRED non-nullable enum — Zod 4
 * rejects null. A valid minimal body must therefore override useCase.
 */
const validAnswers: QuizAnswers = { ...defaultQuizAnswers, useCase: "general" }
const ip = uniqueIp()

function postQuiz(
  body: unknown
): Promise<ApiResponse<QuizResponse | QuizErrorResponse>> {
  return getJson<QuizResponse | QuizErrorResponse>(`${apiBase}/api/quiz`, {
    method: "POST",
    headers: { "content-type": "application/json", ...xffHeader(ip) },
    body: JSON.stringify(body),
  })
}

describe("POST /api/quiz", () => {
  it("accepts a valid minimal body and returns ranked results", async () => {
    const res = await postQuiz(validAnswers)
    const body = res.body as QuizResponse

    expect(res.status).toBe(200)
    expect(body.total).toBe(body.results.length)
    expect(body.results.length).toBeGreaterThan(0)
    expect(body.results.length).toBeLessThanOrEqual(12)

    for (const result of body.results) {
      expect(result.id.length).toBeGreaterThan(0)
      // DTO has no `name` field — brand/model are the name surface.
      expect(result.brand.length).toBeGreaterThan(0)
      expect(result.model.length).toBeGreaterThan(0)
      expect(result.matchScore).toBeGreaterThanOrEqual(0)
      expect(result.matchScore).toBeLessThanOrEqual(100)
      expect(result.matchReasons.length).toBeLessThanOrEqual(4)
      expect(result.tradeoffs.length).toBeLessThanOrEqual(3)
    }
  })

  it("rejects an empty body with a validation error payload", async () => {
    const res = await postQuiz({})
    const body = res.body as QuizErrorResponse

    expect(res.status).toBe(400)
    expect(body.error).toBe("Invalid quiz answers")
    expect(Array.isArray(body.issues)).toBe(true)
    expect(body.issues?.length).toBeGreaterThan(0)
    expect(body.issues?.[0]).toMatch(/^useCase/)
  })

  it("rejects an invalid field type (budgetMin as a string)", async () => {
    const res = await postQuiz({ ...validAnswers, budgetMin: "abc" })
    const body = res.body as QuizErrorResponse

    expect(res.status).toBe(400)
    expect(body.error).toBe("Invalid quiz answers")
    expect(body.issues?.[0]).toMatch(/^budgetMin/)
  })

  it("strips unknown extra fields (Zod 4 default object behavior)", async () => {
    const res = await postQuiz({ ...validAnswers, definitelyNotAField: 42 })
    const body = res.body as QuizResponse

    // safeParse (not strict) on a plain z.object strips unknown keys — the
    // request succeeds and the response is a normal quiz payload.
    expect(res.status).toBe(200)
    expect(Array.isArray(body.results)).toBe(true)
    expect(body.total).toBe(body.results.length)
  })

  it("accepts an optional email alongside the answers", async () => {
    const res = await postQuiz({ ...validAnswers, email: "test@example.com" })
    const body = res.body as QuizResponse

    // Lead upsert + email send are best-effort server-side; only the HTTP
    // contract is asserted (no DB row checks).
    expect(res.status).toBe(200)
    expect(Array.isArray(body.results)).toBe(true)
  })
})
