import { describe, expect, it } from "vitest"
import {
  buildQuizSharePath,
  buildRedditMarkdown,
  parseQuizShareParams,
  type QuizSearchParams,
} from "@/lib/share"
import { SAMPLE_SCOREABLE } from "@/lib/sample-scoreable"

const FILTERED = SAMPLE_SCOREABLE[1] // Lenovo Legion Slim 5, $1299

describe("buildQuizSharePath", () => {
  it("encodes only the set answers", () => {
    expect(buildQuizSharePath({ workload: "esports", budget: 1500 })).toBe(
      "/quiz?workload=esports&budget=1500"
    )
  })

  it("falls back to a bare path with no answers", () => {
    expect(buildQuizSharePath({})).toBe("/quiz")
    expect(buildQuizSharePath({ workload: null, budget: null })).toBe("/quiz")
  })

  it("percent-encodes reserved characters in enum values", () => {
    expect(buildQuizSharePath({ refresh: "144+" })).toBe("/quiz?refresh=144%2B")
  })
})

describe("parseQuizShareParams", () => {
  it("accepts known values and drops unknown ones", () => {
    const parsed = parseQuizShareParams({
      workload: "video-editing",
      portability: "always",
      upgrade: "must",
      form: "13-14",
      refresh: "240+",
    })
    expect(parsed).toEqual({
      workload: "video-editing",
      budget: null,
      portability: "always",
      refresh: "240+",
      upgrade: "must",
      form: "13-14",
    })
  })

  it("rejects values outside the allowlist", () => {
    const parsed = parseQuizShareParams({ workload: "hacking", refresh: "999", form: "wide" })
    expect(parsed.workload).toBeNull()
    expect(parsed.refresh).toBeNull()
    expect(parsed.form).toBeNull()
  })

  it("clamps the budget to the slider range and rejects non-numeric input", () => {
    expect(parseQuizShareParams({ budget: "1500" }).budget).toBe(1500)
    expect(parseQuizShareParams({ budget: "999999" }).budget).toBe(3000)
    expect(parseQuizShareParams({ budget: "100" }).budget).toBe(500)
    expect(parseQuizShareParams({ budget: "abc" }).budget).toBeNull()
    expect(parseQuizShareParams({}).budget).toBeNull()
  })

  it("takes the first value when a param repeats", () => {
    expect(parseQuizShareParams({ workload: ["esports", "everyday"] }).workload).toBe("esports")
  })

  it("round-trips through buildQuizSharePath", () => {
    const selection = {
      workload: "ai-ml" as const,
      budget: 2000,
      portability: "sometimes" as const,
      refresh: "144+" as const,
      upgrade: "nice" as const,
    }
    const path = buildQuizSharePath(selection)
    const query = Object.fromEntries(new URL(path, "http://localhost").searchParams) as QuizSearchParams
    expect(parseQuizShareParams(query)).toEqual({ ...selection, form: null })
  })
})

describe("buildRedditMarkdown", () => {
  it("renders a markdown spec table with the build name and price", () => {
    const md = buildRedditMarkdown(FILTERED, 0.923, "USD", "https://specwise.app/quiz?budget=1500")
    expect(md).toContain("**Top pick: Lenovo Legion Slim 5** — 92% match")
    expect(md).toContain("| Component | Spec |")
    expect(md).toContain("| --- | --- |")
    expect(md).toContain("| RAM | 16 GB DDR5 |")
    expect(md).toContain("| Price | $1,299 |")
    expect(md).toContain("Full breakdown: https://specwise.app/quiz?budget=1500")
  })

  it("escapes pipes so a spec value cannot break the table", () => {
    const mutant = {
      ...FILTERED,
      laptopSpec: { ...FILTERED.laptopSpec, cpuFamily: "Ryzen|7" },
    }
    const md = buildRedditMarkdown(mutant, 0.5, "USD", "/quiz")
    expect(md).toContain("Ryzen\\|7")
    // Every table row still has exactly two unescaped cell separators inside.
    const rows = md.split("\n").filter(l => l.startsWith("|") && !l.startsWith("| ---"))
    for (const row of rows) {
      expect(row.replace(/\\\|/g, "").match(/\|/g)).toHaveLength(3)
    }
  })
})
