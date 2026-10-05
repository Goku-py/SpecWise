/**
 * Compare entry contract (types-only, NO UI).
 *
 * Phase 7 consumes this to enter the canonical `/compare/[slugs]` route once
 * slug resolution exists. No visible compare CTA is rendered until then —
 * results link out to laptop detail pages only.
 */
import type { RecommendationDTO } from "@/lib/recommend/v3/types";

export interface ResultsCompareContext {
  ids: string[];
  overall: Record<string, number>;
}

/** Top-N ranked ids + overall scores in engine order (never re-sorted). */
export function buildResultsCompareContext(
  dto: RecommendationDTO,
  count = 3,
): ResultsCompareContext {
  const ids: string[] = [];
  const overall: Record<string, number> = {};
  for (const item of dto.items.slice(0, Math.max(0, count))) {
    ids.push(item.laptopId);
    overall[item.laptopId] = item.scores.overall;
  }
  return { ids, overall };
}
