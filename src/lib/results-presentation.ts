/**
 * Results-presentation helpers (Phase 4 — Results V2).
 *
 * Pure, JSX-free mapping from the frozen v3 RecommendationDTO to display
 * strings. Every function is total: null-safe, never throws on malformed
 * input. No rewording of engine text, no re-ranking, no scoring.
 */
import type {
  ConfidenceTier,
  RankedItemDTO,
  RecommendationDTO,
} from "@/lib/recommend/v3/types";
import { resolveProductImage } from "@/lib/product-image";

/** Human labels for the 9 scored dims. Unknown dim → raw id (never crash). */
export const DIM_LABELS: Record<string, string> = {
  cpu: "Processing",
  gpu: "Graphics",
  vram: "Video memory",
  ram: "Memory",
  storage: "Storage",
  display: "Display",
  battery: "Battery life",
  portability: "Portability",
  build: "Build quality",
};

export function dimLabel(dim: unknown): string {
  if (typeof dim !== "string" || dim.length === 0) return "Unknown";
  return DIM_LABELS[dim] ?? dim;
}

/** Tier label for a confidence tier. Unknown tier → "Partial fit" (fail safe). */
export function tierLabel(tier: unknown): string {
  if (tier === "high") return "Best fit";
  if (tier === "medium") return "Strong alternative";
  return "Partial fit";
}

function itemName(item: unknown): string {
  if (typeof item !== "object" || item === null) return "This laptop";
  const rec = item as Record<string, unknown>;
  const brand = typeof rec.brand === "string" ? rec.brand : "";
  const model = typeof rec.model === "string" ? rec.model : "";
  const name = `${brand} ${model}`.trim();
  return name.length > 0 ? name : "This laptop";
}

/**
 * Tier-keyed verdict sentence. Never uses "best/perfect/guaranteed" —
 * every claim traces to the DTO's confidence tier.
 */
export function verdictFor(item: unknown): string {
  const name = itemName(item);
  const tier =
    typeof item === "object" && item !== null
      ? (item as Record<string, unknown>).confidence
      : null;
  if (tier === "high") return `${name} is the closest match for your answers.`;
  if (tier === "medium") return `${name} is a strong alternative for your answers.`;
  return `${name} is the closest available option, with caveats below.`;
}

/** `${price} ${currency}`, or null when price is missing/non-finite. */
export function formatPriceShort(
  price: unknown,
  currency: unknown,
): string | null {
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  if (typeof currency !== "string" || currency.length === 0) return `${price}`;
  return `${price} ${currency}`;
}

/**
 * Detail link for a ranked item. `laptopId` is the deterministic DB id, so
 * `/laptops/${laptopId}` always resolves (slug-then-legacy-id fallback + 308).
 */
export function detailHref(item: unknown): string {
  if (typeof item === "object" && item !== null) {
    const id = (item as Record<string, unknown>).laptopId;
    if (typeof id === "string" && id.length > 0)
      return `/laptops/${encodeURIComponent(id)}`;
  }
  return "/laptops";
}

/**
 * Binding between stored results and stored profile. Both blobs are written
 * together on submit; region drift means answers changed after results.
 * Profile null/invalid → "unbound" (results still render; refine starts fresh).
 */
export function bindingStatus(
  dto: unknown,
  profile: unknown,
): "ok" | "stale" | "unbound" {
  if (typeof dto !== "object" || dto === null) return "unbound";
  if (typeof profile !== "object" || profile === null) return "unbound";
  const dtoRegion = (dto as Record<string, unknown>).region;
  const profileRegion = (profile as Record<string, unknown>).region;
  if (typeof dtoRegion !== "string" || typeof profileRegion !== "string")
    return "unbound";
  return dtoRegion === profileRegion ? "ok" : "stale";
}

/**
 * Image source for a result item. The frozen v3 DTO carries no image field,
 * so today's items resolve to null (neutral fallback). When an item carries
 * an `imageUrl` (server-side data-enrichment only — see attachResultImages),
 * it is returned ONLY if it passes the shared allowlist resolver; anything
 * else falls back. Images confirm, scores rank — this value never feeds
 * scoring (asserted in product-image.test.ts).
 */
export function resultImageSrc(item: unknown): string | null {
  if (typeof item !== "object" || item === null) return null;
  const resolved = resolveProductImage(
    (item as Record<string, unknown>).imageUrl,
  );
  return resolved.kind === "image" ? resolved.src : null;
}

/**
 * Server-side data-enrichment for result items (Phase 8): attaches the
 * validated per-laptop imageUrl AFTER scoring, keyed by laptopId. Pure and
 * total — every field except the added `imageUrl` is preserved by reference
 * shape (spread), so ranking/scores/confidence are byte-identical before and
 * after. Unknown ids and invalid URLs become null (honest fallback).
 */
export function attachResultImages<T extends RankedItemDTO>(
  items: readonly T[],
  images: Record<string, string | null | undefined>,
): (T & { imageUrl: string | null })[] {
  if (!Array.isArray(items)) return [];
  const map =
    typeof images === "object" && images !== null
      ? (images as Record<string, unknown>)
      : {};
  return items.map(item => {
    const resolved = resolveProductImage(map[item.laptopId]);
    return { ...item, imageUrl: resolved.kind === "image" ? resolved.src : null };
  });
}

export interface RelaxRow {
  requirement: string;
  from: string;
  to: string;
  reason: string;
}

/** Pass-through mapper over the relaxation ledger — no rewording of engine text. */
export function relaxSummary(ledger: unknown): RelaxRow[] {
  if (!Array.isArray(ledger)) return [];
  const rows: RelaxRow[] = [];
  for (const e of ledger) {
    if (typeof e !== "object" || e === null) continue;
    const rec = e as Record<string, unknown>;
    rows.push({
      requirement: typeof rec.requirement === "string" ? rec.requirement : "",
      from: typeof rec.from === "string" ? rec.from : "",
      to: typeof rec.to === "string" ? rec.to : "",
      reason: typeof rec.reason === "string" ? rec.reason : "",
    });
  }
  return rows;
}

/**
 * Overall-score gap between two ranked items (for the "Why above" line).
 * Null when either score is missing/non-finite.
 */
export function overallGap(a: unknown, b: unknown): number | null {
  const score = (x: unknown): number | null => {
    if (typeof x !== "object" || x === null) return null;
    const s = (x as Record<string, unknown>).scores;
    if (typeof s !== "object" || s === null) return null;
    const v = (s as Record<string, unknown>).overall;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const sa = score(a);
  const sb = score(b);
  if (sa == null || sb == null) return null;
  return sa - sb;
}

/** Type guards used by the view (total, no throws). */
export function asRecommendationDTO(u: unknown): RecommendationDTO | null {
  if (typeof u !== "object" || u === null) return null;
  const rec = u as Record<string, unknown>;
  if (rec.schemaVersion !== "v3" || !Array.isArray(rec.items)) return null;
  return u as RecommendationDTO;
}

export function topItem(dto: RecommendationDTO): RankedItemDTO | null {
  return dto.items.length > 0 ? dto.items[0] : null;
}

export type { ConfidenceTier };
