import { describe, expect, it } from "vitest"
import {
  buildComparisonPairs,
  canonicalComparisonPath,
  type ComparisonCandidate,
} from "@/lib/compare-pairs"

const NOW = new Date("2026-09-01T00:00:00.000Z")

function candidate(over: Partial<ComparisonCandidate> & { slug: string }): ComparisonCandidate {
  return {
    category: "LAPTOP",
    isPopular: true,
    score: 8,
    updatedAt: NOW,
    ...over,
  }
}

describe("canonicalComparisonPath", () => {
  it("orders slugs alphabetically and is order-stable", () => {
    expect(canonicalComparisonPath("zeta", "alpha")).toBe("/compare/alpha-vs-zeta")
    expect(canonicalComparisonPath("alpha", "zeta")).toBe("/compare/alpha-vs-zeta")
  })
})

describe("buildComparisonPairs", () => {
  it("pairs each ranked item with its next neighbours (bounded, no N^2)", () => {
    const items = ["a", "b", "c", "d"].map((slug, i) =>
      candidate({ slug, score: 10 - i })
    )
    const pairs = buildComparisonPairs(items, { neighbours: 1 })
    expect(pairs.map(p => `${p.a}-vs-${p.b}`)).toEqual(["a-vs-b", "b-vs-c", "c-vs-d"])
  })

  it("never emits the same canonical pair twice", () => {
    const pairs = buildComparisonPairs(
      ["a", "b", "c"].map(slug => candidate({ slug })),
      { neighbours: 5 }
    )
    const keys = pairs.map(p => `${p.a}-vs-${p.b}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(["a-vs-b", "a-vs-c", "b-vs-c"])
  })

  it("only pairs within the same category", () => {
    const pairs = buildComparisonPairs([
      candidate({ slug: "laptop-a", category: "LAPTOP" }),
      candidate({ slug: "laptop-b", category: "LAPTOP" }),
      candidate({ slug: "gpu-a", category: "GPU" }),
      candidate({ slug: "gpu-b", category: "GPU" }),
    ])
    const keys = pairs.map(p => `${p.a}-vs-${p.b}`).sort()
    expect(keys).toEqual(["gpu-a-vs-gpu-b", "laptop-a-vs-laptop-b"])
  })

  it("falls back to top-rated items when fewer than two are popular", () => {
    const pairs = buildComparisonPairs([
      candidate({ slug: "popular", isPopular: true }),
      candidate({ slug: "rated-1", isPopular: false, score: 9 }),
      candidate({ slug: "rated-2", isPopular: false, score: 7 }),
      candidate({ slug: "rated-3", isPopular: false, score: 5 }),
    ])
    // popular(8) then rated by score: popular, rated-1, rated-2, rated-3
    const keys = pairs.map(p => `${p.a}-vs-${p.b}`)
    expect(keys).toContain("popular-vs-rated-1")
    expect(keys).toContain("rated-1-vs-rated-2")
  })

  it("caps candidates per category", () => {
    const items = Array.from({ length: 10 }, (_, i) => candidate({ slug: `s${i}`, score: 10 - i }))
    const pairs = buildComparisonPairs(items, { maxPerCategory: 3, neighbours: 1 })
    expect(pairs.map(p => `${p.a}-vs-${p.b}`)).toEqual(["s0-vs-s1", "s1-vs-s2"])
  })

  it("sets lastModified to the newer of the two rows and skips blank slugs", () => {
    const older = new Date("2026-01-01T00:00:00.000Z")
    const newer = new Date("2026-06-01T00:00:00.000Z")
    const pairs = buildComparisonPairs([
      candidate({ slug: "old", updatedAt: older }),
      candidate({ slug: "new", updatedAt: newer }),
      candidate({ slug: "", updatedAt: newer }),
    ])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].lastModified.toISOString()).toBe(newer.toISOString())
  })
})
