/**
 * Programmatic comparison-pair generation (pure).
 *
 * The `/compare/[slugs]` route resolves laptops by slug, so pairs must be built
 * from the same slug identity. All pairs share ONE canonical order (lexicographic)
 * so /compare/a-vs-b and /compare/b-vs-a are never emitted twice.
 */

export interface ComparisonCandidate {
  slug: string
  /** Grouping key — only same-category items are paired. */
  category: string
  isPopular: boolean
  /** reviewScore; used to rank when there are not enough popular items. */
  score: number | null
  updatedAt: Date
}

export interface ComparisonPair {
  a: string
  b: string
  lastModified: Date
}

export interface PairOptions {
  /** Max candidates taken per category. Default 12. */
  maxPerCategory?: number
  /** Each candidate is paired with this many higher-ranked neighbours. Default 4. */
  neighbours?: number
}

/** Canonical, order-stable comparison path (matches the route's canonical URL). */
export function canonicalComparisonPath(slugA: string, slugB: string): string {
  const [a, b] = slugA <= slugB ? [slugA, slugB] : [slugB, slugA]
  return `/compare/${a}-vs-${b}`
}

function byScoreDesc(a: ComparisonCandidate, b: ComparisonCandidate): number {
  return (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.slug.localeCompare(b.slug)
}

/**
 * Bounded set of high-value comparison pairs: for each category, rank the
 * popular items (falling back to top-rated) and pair each with its nearest
 * higher-ranked neighbours. O(categories × N × K), never N².
 */
export function buildComparisonPairs(
  candidates: ComparisonCandidate[],
  options: PairOptions = {}
): ComparisonPair[] {
  const maxPerCategory = options.maxPerCategory ?? 12
  const neighbours = Math.max(1, options.neighbours ?? 4)

  const groups = new Map<string, ComparisonCandidate[]>()
  for (const candidate of candidates) {
    if (!candidate.slug) continue
    const group = groups.get(candidate.category) ?? []
    group.push(candidate)
    groups.set(candidate.category, group)
  }

  const pairs = new Map<string, ComparisonPair>()

  for (const group of groups.values()) {
    const popular = group.filter(c => c.isPopular)
    // Need at least two popular items; otherwise fall back to the top-rated set.
    const ranked = (popular.length >= 2 ? popular : group).slice()
    ranked.sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || byScoreDesc(a, b))

    const picked = ranked.slice(0, maxPerCategory)
    for (let i = 0; i < picked.length; i++) {
      for (let j = i + 1; j < Math.min(i + 1 + neighbours, picked.length); j++) {
        const x = picked[i]
        const y = picked[j]
        const [a, b] = x.slug <= y.slug ? [x.slug, y.slug] : [y.slug, x.slug]
        const lastModified = new Date(Math.max(x.updatedAt.getTime(), y.updatedAt.getTime()))
        pairs.set(`${a}\u0000${b}`, { a, b, lastModified })
      }
    }
  }

  return [...pairs.values()].sort((p, q) => p.a.localeCompare(q.a) || p.b.localeCompare(q.b))
}
