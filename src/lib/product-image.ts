/**
 * Shared product-image contract (Phase 8).
 *
 * IMAGE IDENTITY RULE (deterministic per laptop id): a laptop's display image
 * is EXACTLY the validated `Laptop.imageUrl` scalar stored for that row — or
 * nothing (fallback). There is no filename convention (`{id}.jpg`), no
 * per-model curated list, no keyword guessing, and no host fallback chain:
 * when in doubt the resolver returns `fallback`, never a guessed image.
 * (IMAGE CORRECTNESS > QUANTITY.)
 *
 * ALLOWLIST: mirrors `images.remotePatterns` in `next.config.ts` — exactly
 * `images.unsplash.com` over https. Any other host (or malformed/relative/
 * non-https URL) is rejected at WRITE time (admin form schema, PATCH
 * validation, import schema) AND defensively at READ time here, so a legacy
 * bad row degrades to the fallback tile instead of crashing a route segment
 * (Next `next/image` rejects non-allowlisted hosts at optimization time).
 *
 * This module is JSX-free so Zod schemas, server components, and unit tests
 * can share it without a React runtime.
 */

/** Exact hosts in `next.config.ts` `images.remotePatterns`. Keep in sync. */
export const PRODUCT_IMAGE_HOSTS: readonly string[] = ["images.unsplash.com"];

/** https URL on exactly one allowlisted host (path required — bare origins render nothing useful). */
export function isAllowedProductImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (!(PRODUCT_IMAGE_HOSTS as readonly string[]).includes(url.hostname)) return false;
  return url.pathname.length > 1;
}

export type ProductImageResolution =
  | { kind: "image"; src: string }
  | { kind: "fallback" };

/**
 * Deterministic display model for one laptop row. Same resolver backs the
 * catalog card, detail gallery, compare table, and results hero/options, so
 * every surface agrees on image-vs-fallback for a given row.
 */
export function resolveProductImage(imageUrl: unknown): ProductImageResolution {
  if (!isAllowedProductImageUrl(imageUrl)) return { kind: "fallback" };
  return { kind: "image", src: imageUrl.trim() };
}

/** Factual alt text everywhere: "{brand} {model}". */
export function productImageAlt(brand: unknown, model: unknown): string {
  const name = `${typeof brand === "string" ? brand : ""} ${typeof model === "string" ? model : ""}`.trim();
  return name.length > 0 ? name : "Laptop";
}
