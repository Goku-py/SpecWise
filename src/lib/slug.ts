/**
 * Shared slug/id helpers (phase 2b).
 *
 * Laptop.slug is intentionally NON-unique in the DB (see schema.prisma) —
 * uniqueness is enforced in the application write layer. Every writer (the
 * seed, src/lib/db/catalog.ts) must use these same rules so slugs never
 * collide: slugify + numeric suffix on collision.
 */

// Lowercase brand-model-variant -> kebab-case; strip anything that is not
// [a-z0-9-] (spaces, dots, slashes, non-ASCII all collapse to a single dash).
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Returns `base` if it is free, otherwise `base-2`, `base-3`, ... until a free
 * slug is found. The caller seeds `taken` with every slug that must not be
 * reused (all existing DB slugs, or all slugs from a seed run).
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  let slug = base
  let n = 2
  while (taken.has(slug)) {
    slug = `${base}-${n}`
    n++
  }
  return slug
}

/**
 * Deterministic laptop id (Brand-Model[-Variant]) — the legacy identity used by
 * the seed's upsert and by the bulk import endpoint (upsert semantics require a
 * stable id; slugs are the URL identity and stay free to change).
 */
export function deterministicLaptopId(
  brand: string,
  model: string,
  variant: string | null
): string {
  const base = `${brand}-${model}`
  const variantPart = (variant || "").replace(/\s+/g, "-")
  return variantPart ? `${base}-${variantPart}` : base
}
