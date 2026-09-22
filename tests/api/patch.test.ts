import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { updateLaptop } from "@/lib/db/catalog"
import { alignRateLimitWindow, apiBase, bearerHeaders, getJson, uniqueIp } from "./helpers"

interface PatchResponse {
  laptop: { id: string; notes: string | null }
}

interface ErrorResponse {
  error: string
}

const ip = uniqueIp()
const QA_NOTES = "QA patch test"

let targetId = ""
let originalNotes = ""

function patch(id: string, body: unknown, requestIp: string = ip) {
  return getJson<PatchResponse | ErrorResponse>(`${apiBase}/api/laptops/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...bearerHeaders(requestIp) },
    body: JSON.stringify(body),
  })
}

describe("PATCH /api/laptops/[id]", () => {
  beforeAll(async () => {
    // Pick a laptop whose notes are non-null so the notes round-trip can
    // restore the exact original value (the PATCH API rejects null strings).
    const found = await prisma.laptop.findFirst({
      where: { notes: { not: null } },
      select: { id: true, notes: true },
    })
    if (!found || found.notes === null) {
      throw new Error("catalog has no laptop with non-null notes")
    }
    targetId = found.id
    originalNotes = found.notes
  })

  it("rejects an unknown field with 400", async () => {
    const res = await patch(targetId, { nonsenseField: "x" })

    expect(res.status).toBe(400)
    expect((res.body as ErrorResponse).error).toBe("Unknown field: nonsenseField")
  })

  it("rejects an invalid value type (reviewScore as string) with 400", async () => {
    const res = await patch(targetId, { reviewScore: "abc" })

    expect(res.status).toBe(400)
    expect((res.body as ErrorResponse).error).toBe("Field reviewScore must be a number")
  })

  it("returns 404 for a nonexistent id", async () => {
    const res = await patch("does-not-exist-xyz", { notes: "x" })

    expect(res.status).toBe(404)
    expect((res.body as ErrorResponse).error).toBe("Laptop not found")
  })

  it("applies a valid minimal patch and reverts it exactly", async () => {
    const applied = await patch(targetId, { notes: QA_NOTES })
    expect(applied.status).toBe(200)
    expect((applied.body as PatchResponse).laptop.notes).toBe(QA_NOTES)

    const reverted = await patch(targetId, { notes: originalNotes })
    expect(reverted.status).toBe(200)
    expect((reverted.body as PatchResponse).laptop.notes).toBe(originalNotes)
  })

  it("rate limit: the 31st PATCH from one IP returns 429 with Retry-After", async () => {
    const rateIp = uniqueIp()
    await alignRateLimitWindow()

    const statuses: number[] = []
    let retryAfter: string | null = null
    let limitBody: unknown

    for (let i = 0; i < 31; i++) {
      const res = await patch(targetId, { notes: QA_NOTES }, rateIp)
      statuses.push(res.status)
      if (res.status === 429) {
        if (retryAfter === null) retryAfter = res.headers.get("retry-after")
        if (limitBody === undefined) limitBody = res.body
      }
    }

    expect(statuses[0]).toBe(200)
    expect(statuses[30]).toBe(429)
    expect(statuses.filter(s => s === 200).length).toBe(30)
    expect(retryAfter).toBe("60")
    expect(limitBody).toEqual({ error: "Rate limit exceeded" })
  }, 120_000)

  afterAll(async () => {
    // Belt-and-braces: restore the original notes even if a test above failed
    // mid-way (the rate-limit hammer leaves notes = QA_NOTES on success).
    try {
      const current = await prisma.laptop.findUnique({
        where: { id: targetId },
        select: { notes: true },
      })
      if (current && current.notes !== originalNotes) {
        await updateLaptop(targetId, { notes: originalNotes })
      }
    } finally {
      await prisma.$disconnect()
    }
  })
})
