/**
 * Compare-selection URL helpers (pure, zero-deps, unit-tested).
 *
 * The `/compare?ids=a,b` route resolves ids server-side via `getLaptopById`
 * (misses are skipped and listed honestly). These helpers only build and
 * parse that `ids` query value — they never score, rank, or declare winners.
 * Displayed scores come exclusively from the stored v3 DTO (see
 * `ComparePersonalization`); these helpers carry ids only.
 */
import { canonicalComparisonPath } from "./compare-pairs";

/** Max columns the comparison table renders. Extra ids are dropped (first wins). */
export const MAX_COMPARE_IDS = 3;

function cleanOne(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const decoded = decodeURIComponent(trimmed).trim();
    return decoded ? decoded : null;
  } catch {
    return trimmed;
  }
}

/**
 * Parse an `?ids=` query value into deduped non-empty ids, capped at 3.
 * Order-preserving (first occurrence wins). Null/empty → [].
 */
export function parseCompareIds(q: string | null): string[] {
  if (!q) return [];
  const out: string[] = [];
  for (const part of q.split(",")) {
    const id = cleanOne(part);
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= MAX_COMPARE_IDS) break;
  }
  return out;
}

/** Append an id; duplicates ignored, capped at 3. */
export function addCompareId(cur: string[], id: string): string[] {
  const clean = cleanOne(id);
  if (!clean || cur.includes(clean)) return [...cur];
  return [...cur, clean].slice(0, MAX_COMPARE_IDS);
}

/** Remove an id (no-op when absent). */
export function removeCompareId(cur: string[], id: string): string[] {
  return cur.filter(c => c !== id);
}

/** Swap one selected id for another (no-op when oldId absent; dup → drop old). */
export function replaceCompareId(cur: string[], oldId: string, newId: string): string[] {
  const clean = cleanOne(newId);
  if (!clean || !cur.includes(oldId)) return [...cur];
  return cur
    .map(c => (c === oldId ? clean : c))
    .filter((c, i, arr) => arr.indexOf(c) === i)
    .slice(0, MAX_COMPARE_IDS);
}

/** `/compare?ids=a,b` (ids URL-encoded); empty → `/compare`. */
export function compareHref(ids: readonly string[]): string {
  const clean = ids
    .map(cleanOne)
    .filter((id): id is string => id != null)
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, MAX_COMPARE_IDS);
  if (clean.length === 0) return "/compare";
  return `/compare?ids=${clean.map(encodeURIComponent).join(",")}`;
}

/** Canonical two-device SEO path — order-stable, never reimplemented here. */
export function pairHref(slugA: string, slugB: string): string {
  return canonicalComparisonPath(slugA, slugB);
}
