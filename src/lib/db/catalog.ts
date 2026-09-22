import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { invalidateCatalogCache } from "@/lib/catalog-cache"
import { slugify, uniqueSlug, deterministicLaptopId } from "@/lib/slug"
import type { LaptopFormValues } from "@/lib/laptop-fields"
import type { Laptop, LaptopPrice, Status, Prisma } from "@/generated/prisma/client"

/**
 * Unified mutation layer (phase 2b) — the ONLY module that writes laptops /
 * prices. Every write function:
 *   - maps Prisma P2025 (not found) / P2002 (conflict) to friendly errors,
 *   - NEVER throws to the caller (returns { ok: false, error }),
 *   - on success invalidates the catalog cache AND revalidates every route
 *     that renders laptop data, so no path is left stale.
 */

// ── Editable field whitelists ───────────────────────────────────────────────
// Moved here from the PATCH route (src/app/api/laptops/[id]/route.ts) so the
// API, admin forms and import share one source of truth. LAPTOP_FIELDS (the
// form surface) is a subset of these — the extras (cpuGeneration, gpuVRAM,
// displayPanelType, …) remain API-only.

export const LAPTOP_EDITABLE_FIELDS = {
  string: [
    "brand", "model", "variant", "os", "cpuBrand", "cpuFamily", "cpuGeneration",
    "gpuType", "gpuModel", "ramType", "storageType", "displayResolution",
    "displayPanelType", "displayColorGamut", "wireless", "buildMaterial",
    "webcamQuality", "imageUrl", "notes",
  ] as const,
  number: [
    "cpuCores", "cpuBenchmark", "gpuVRAM", "ramAmount", "storageAmount",
    "displaySize", "displayRefreshRate", "displayBrightness", "batteryCapacity",
    "batteryLife", "weight", "reviewScore",
  ] as const,
  boolean: [
    "ramUpgradeable", "storageExpandable", "displayTouch", "keyboardBacklit",
    "isTouchscreen", "isRefurbished", "isPopular",
  ] as const,
  enum: { status: ["draft", "active", "archived"] } as const,
  stringArray: ["ports", "securityFeatures"] as const,
} as const

/**
 * Patch payload accepted by updateLaptop. `null` means "set the column to
 * NULL" (admin edit forms send null for cleared optional fields); the PATCH
 * API never emits null — its whitelist validator rejects it.
 */
export type LaptopPatchData = Record<string, string | number | boolean | string[] | null>

/** Same validation contract as the old PATCH route (unknown fields rejected). */
export function validateLaptopPatch(body: unknown): { data: LaptopPatchData; error?: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { data: {}, error: "Request body must be an object" }
  }

  const input = body as Record<string, unknown>
  const data: LaptopPatchData = {}

  for (const key of Object.keys(input)) {
    const value = input[key]

    if ((LAPTOP_EDITABLE_FIELDS.string as readonly string[]).includes(key)) {
      if (typeof value !== "string") return { data: {}, error: `Field ${key} must be a string` }
      data[key] = value
    } else if ((LAPTOP_EDITABLE_FIELDS.number as readonly string[]).includes(key)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return { data: {}, error: `Field ${key} must be a number` }
      }
      data[key] = value
    } else if ((LAPTOP_EDITABLE_FIELDS.boolean as readonly string[]).includes(key)) {
      if (typeof value !== "boolean") return { data: {}, error: `Field ${key} must be a boolean` }
      data[key] = value
    } else if (key in LAPTOP_EDITABLE_FIELDS.enum) {
      const allowed = LAPTOP_EDITABLE_FIELDS.enum[key as keyof typeof LAPTOP_EDITABLE_FIELDS.enum]
      if (typeof value !== "string" || !allowed.includes(value as never)) {
        return { data: {}, error: `Field ${key} must be one of: ${allowed.join(", ")}` }
      }
      data[key] = value
    } else if ((LAPTOP_EDITABLE_FIELDS.stringArray as readonly string[]).includes(key)) {
      if (!Array.isArray(value) || value.some(v => typeof v !== "string")) {
        return { data: {}, error: `Field ${key} must be an array of strings` }
      }
      data[key] = value
    } else {
      return { data: {}, error: `Unknown field: ${key}` }
    }
  }

  return { data }
}

// ── Result types ────────────────────────────────────────────────────────────

export type WriteErrorCode = "not_found" | "conflict" | "unknown"

export type CatalogWriteResult =
  | { ok: true; laptop: Laptop }
  | { ok: false; error: string; code: WriteErrorCode }

export type PriceWriteResult =
  | { ok: true; price: LaptopPrice }
  | { ok: false; error: string; code: WriteErrorCode }

export type ImportWriteResult =
  | { ok: true; imported: number }
  | { ok: false; error: string; code: WriteErrorCode }

export interface CreateLaptopOptions {
  /** Deterministic id (Brand-Model[-Variant]); defaults to a Prisma cuid. */
  id?: string
  /** Explicit slug override; auto-generated from brand-model-variant otherwise. */
  slug?: string
  /** Only applied on CREATE (re-imports never clobber an existing status). */
  status?: Status
}

export interface PriceWrite {
  laptopId: string
  region: string
  retailer: string
  /** WHOLE currency units (major units) — see LaptopPrice.price in schema.prisma. */
  price: number
  currency: string
  url?: string | null
  affiliateUrl?: string | null
}

export interface ImportLaptopItem {
  data: LaptopFormValues
  prices?: Omit<PriceWrite, "laptopId">[]
}

// ── Private helpers ─────────────────────────────────────────────────────────

function mapWriteError(err: unknown): { error: string; code: WriteErrorCode } {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code
    if (code === "P2025") return { error: "Laptop not found", code: "not_found" }
    if (code === "P2002") {
      return { error: "Conflict: a record with those values already exists", code: "conflict" }
    }
  }
  console.error("Catalog write error:", err)
  return { error: "Database error", code: "unknown" }
}

/**
 * Must run after every successful write. Two layers:
 *  1. invalidateCatalogCache() — busts the unstable_cache tag shared by
 *     getActiveCatalog / getLaptopById / getLaptopBySlug (quiz, recommendations,
 *     lists, detail pages).
 *  2. revalidatePath() for the statically rendered App Router pages. Dynamic
 *     route patterns require an explicit `type: "page"` in Next 16 or they
 *     silently no-op. "/laptops/[slug]" is not a real route (only [id] exists)
 *     but is revalidated anyway for forward-compat; the tag is harmless.
 *
 * The revalidate* calls throw when this module runs OUTSIDE the Next.js
 * runtime (e.g. tsx scripts importing catalog.ts directly — no request/static
 * generation context). The DB write has already committed at that point, so a
 * script must not observe a false failure: log and continue. Inside the app
 * these calls never throw in practice.
 */
function invalidateAfterWrite() {
  // Outside the Next.js runtime (tsx scripts, test processes) there is no
  // static-generation store — revalidate* would throw and the write is already
  // committed. Callers opt out explicitly via env (tests, scripts).
  if (process.env.SKIP_CACHE_REVALIDATE === "1") return
  try {
    invalidateCatalogCache()
    revalidatePath("/")
    revalidatePath("/laptops")
    revalidatePath("/laptops/[id]", "page")
    revalidatePath("/laptops/[slug]", "page")
    revalidatePath("/category/[useCase]", "page")
    revalidatePath("/admin")
  } catch (err) {
    console.error("Catalog invalidation error (write already committed):", err)
  }
}

/** Builds the slug base for a laptop (brand-model[-variant]). */
function slugBase(brand: string, model: string, variant: string | null): string {
  return slugify(`${brand}-${model}-${variant ?? ""}`)
}

/**
 * Resolves a unique slug for `base` against every existing DB slug.
 * Conservative by design: `startsWith(base)` also protects against suffix
 * collisions (base-2, base-3, …) and against a future laptop whose slug merely
 * shares a prefix (e.g. "dell-xps" vs existing "dell-xps-13") — the only cost
 * is an occasional higher suffix.
 */
async function resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const rows = await prisma.laptop.findMany({
    where: { slug: { startsWith: base } },
    select: { id: true, slug: true },
  })
  const taken = new Set<string>()
  for (const row of rows) {
    if (row.slug && row.id !== excludeId) taken.add(row.slug)
  }
  return uniqueSlug(base, taken)
}

/** Minimal writer surface for slug-redirect recording (prisma or a $transaction client). */
type RedirectWriter = Pick<typeof prisma, "slugRedirect">

/**
 * Records oldSlug -> laptopId (Phase 3). Deterministic + idempotent: no-ops on
 * missing/identical slugs; latest owner wins via upsert on `from`. Read paths
 * resolve `from` straight to the laptop's CURRENT slug (single hop), so stale
 * chains and swaps can never cycle.
 */
export async function recordSlugRedirect(
  db: RedirectWriter,
  laptopId: string,
  oldSlug: string | null,
  newSlug: string | null
): Promise<void> {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return
  await db.slugRedirect.upsert({
    where: { from: oldSlug },
    update: { laptopId },
    create: { from: oldSlug, laptopId },
  })
}

/** Links Laptop.brandId to the Brand master row by display name (null if unknown). */
async function resolveBrandId(brandName: string): Promise<string | null> {
  const brand = await prisma.brand.findUnique({
    where: { name: brandName },
    select: { id: true },
  })
  return brand?.id ?? null
}

/** Maps validated LaptopFormValues onto the Prisma create/update data shape. */
function toLaptopData(data: LaptopFormValues) {
  return {
    brand: data.brand,
    model: data.model,
    variant: data.variant,
    os: data.os,
    cpuBrand: data.cpuBrand,
    cpuFamily: data.cpuFamily,
    cpuCores: data.cpuCores,
    gpuType: data.gpuType,
    gpuModel: data.gpuModel,
    ramAmount: data.ramAmount,
    ramType: data.ramType,
    ramUpgradeable: data.ramUpgradeable,
    storageAmount: data.storageAmount,
    storageType: data.storageType,
    storageExpandable: data.storageExpandable,
    displaySize: data.displaySize,
    displayResolution: data.displayResolution,
    displayRefreshRate: data.displayRefreshRate,
    displayTouch: data.displayTouch,
    batteryLife: data.batteryLife,
    weight: data.weight,
    buildMaterial: data.buildMaterial,
    webcamQuality: data.webcamQuality,
    ports: data.ports,
    wireless: data.wireless,
    securityFeatures: data.securityFeatures,
    keyboardBacklit: data.keyboardBacklit,
    isTouchscreen: data.isTouchscreen,
    isRefurbished: data.isRefurbished,
    isPopular: data.isPopular,
    reviewScore: data.reviewScore,
    notes: data.notes,
    imageUrl: data.imageUrl,
  }
}

function priceData(p: Omit<PriceWrite, "laptopId">) {
  return {
    region: p.region,
    retailer: p.retailer,
    price: p.price,
    currency: p.currency,
    url: p.url ?? null,
    affiliateUrl: p.affiliateUrl ?? null,
  }
}

// ── Public write API ────────────────────────────────────────────────────────

/**
 * Creates a laptop. Slug: `opts.slug` wins; otherwise auto-generated from
 * brand-model-variant with a uniqueness suffix against the DB.
 */
export async function createLaptop(
  data: LaptopFormValues,
  opts: CreateLaptopOptions = {}
): Promise<CatalogWriteResult> {
  try {
    const slug = opts.slug ?? (await resolveUniqueSlug(slugBase(data.brand, data.model, data.variant)))
    const brandId = await resolveBrandId(data.brand)

    const laptop = await prisma.laptop.create({
      data: {
        ...(opts.id ? { id: opts.id } : {}),
        slug,
        brandId,
        status: opts.status ?? "active",
        ...toLaptopData(data),
      },
    })

    invalidateAfterWrite()
    return { ok: true, laptop }
  } catch (err) {
    return { ok: false, ...mapWriteError(err) }
  }
}

/**
 * Updates a laptop with a validated patch (see validateLaptopPatch).
 *
 * Slug policy (documented): the slug is NEVER regenerated on a plain edit —
 * it only changes when `brand` or `model` itself changes (the URL identity
 * should survive typo fixes to variant, ramAmount, etc.). When brand/model do
 * change, the new slug is derived from brand-model-variant and made unique.
 */
export async function updateLaptop(id: string, data: LaptopPatchData): Promise<CatalogWriteResult> {
  // Defense in depth: reject fields outside the editable whitelist. Callers
  // (PATCH route, admin actions) already validate, but this keeps the write
  // layer safe on its own.
  const known = new Set<string>([
    ...LAPTOP_EDITABLE_FIELDS.string,
    ...LAPTOP_EDITABLE_FIELDS.number,
    ...LAPTOP_EDITABLE_FIELDS.boolean,
    ...LAPTOP_EDITABLE_FIELDS.stringArray,
    ...Object.keys(LAPTOP_EDITABLE_FIELDS.enum),
  ])
  for (const key of Object.keys(data)) {
    if (!known.has(key)) return { ok: false, error: `Unknown field: ${key}`, code: "unknown" }
  }

  try {
    const current = await prisma.laptop.findUnique({
      where: { id },
      select: { brand: true, model: true, variant: true, slug: true },
    })
    if (!current) return { ok: false, error: "Laptop not found", code: "not_found" }

    let slug: string | undefined
    if (data.brand !== undefined || data.model !== undefined) {
      const brand = typeof data.brand === "string" ? data.brand : current.brand
      const model = typeof data.model === "string" ? data.model : current.model
      const variant = typeof data.variant === "string" ? data.variant : current.variant
      slug = await resolveUniqueSlug(slugBase(brand, model, variant), id)
    }

    const laptop = await prisma.laptop.update({
      where: { id },
      // Cast is safe: keys were validated against the whitelist above and the
      // values match LaptopUpdateInput (string/number/boolean/string[]/null).
      data: { ...data, ...(slug ? { slug } : {}) } as Prisma.LaptopUpdateInput,
    })

    // Phase 3: preserve the old URL identity (best-effort; never fails the edit).
    if (slug) {
      try {
        await recordSlugRedirect(prisma, id, current.slug, slug)
      } catch (err) {
        console.error("Slug redirect record error (non-fatal):", err)
      }
    }

    invalidateAfterWrite()
    return { ok: true, laptop }
  } catch (err) {
    return { ok: false, ...mapWriteError(err) }
  }
}

/** Flips status (active <-> archived <-> draft). P2025 → "Laptop not found". */
export async function setLaptopStatus(id: string, status: Status): Promise<CatalogWriteResult> {
  try {
    const laptop = await prisma.laptop.update({ where: { id }, data: { status } })
    invalidateAfterWrite()
    return { ok: true, laptop }
  } catch (err) {
    return { ok: false, ...mapWriteError(err) }
  }
}

/**
 * Upserts a single price on the composite PK (laptopId, region, retailer).
 * Mostly useful for one-off corrections; bulk imports should use
 * createLaptopWithPrices / importLaptops for transactionality.
 */
export async function upsertLaptopPrice(p: PriceWrite): Promise<PriceWriteResult> {
  try {
    const price = await prisma.laptopPrice.upsert({
      where: {
        laptopId_region_retailer: { laptopId: p.laptopId, region: p.region, retailer: p.retailer },
      },
      update: priceData(p),
      create: { laptopId: p.laptopId, ...priceData(p) },
    })
    invalidateAfterWrite()
    return { ok: true, price }
  } catch (err) {
    return { ok: false, ...mapWriteError(err) }
  }
}

/**
 * Deletes a laptop. Prices AND price snapshots cascade via the FK onDelete:
 * Cascade in schema.prisma — snapshots are derived time-series of this laptop's
 * own prices, so deleting the laptop deletes its snapshots too (documented
 * decision; no "in use" rejection).
 */
export async function deleteLaptop(id: string): Promise<CatalogWriteResult> {
  try {
    const laptop = await prisma.laptop.delete({ where: { id } })
    invalidateAfterWrite()
    return { ok: true, laptop }
  } catch (err) {
    return { ok: false, ...mapWriteError(err) }
  }
}

/**
 * Transactional create-or-update of one laptop + its prices (import building
 * block). Uses the deterministic id (Brand-Model[-Variant], override via
 * opts.id) so re-importing the same product UPDATES it instead of duplicating.
 * Existing rows keep their status unless opts.status is explicitly given.
 */
export async function createLaptopWithPrices(
  data: LaptopFormValues,
  prices: Omit<PriceWrite, "laptopId">[],
  opts: CreateLaptopOptions = {}
): Promise<CatalogWriteResult> {
  try {
    const id = opts.id ?? deterministicLaptopId(data.brand, data.model, data.variant)
    const slug = opts.slug ?? (await resolveUniqueSlug(slugBase(data.brand, data.model, data.variant), id))
    const brandId = await resolveBrandId(data.brand)

    const laptop = await prisma.$transaction(async tx => {
      const lap = await tx.laptop.upsert({
        where: { id },
        update: {
          ...toLaptopData(data),
          slug,
          brandId,
          ...(opts.status ? { status: opts.status } : {}),
        },
        create: {
          id,
          slug,
          brandId,
          status: opts.status ?? "active",
          ...toLaptopData(data),
        },
      })
      for (const p of prices) {
        await tx.laptopPrice.upsert({
          where: { laptopId_region_retailer: { laptopId: id, region: p.region, retailer: p.retailer } },
          update: priceData(p),
          create: { laptopId: id, ...priceData(p) },
        })
      }
      return lap
    })

    invalidateAfterWrite()
    return { ok: true, laptop }
  } catch (err) {
    return { ok: false, ...mapWriteError(err) }
  }
}

/**
 * Bulk import: one $transaction for the whole batch, ONE invalidation after
 * it commits. The endpoint validates every item up front (per-index errors);
 * if any item fails at the DB level the whole batch rolls back atomically and
 * returns { ok: false } — callers must re-submit, nothing is half-written.
 */
export async function importLaptops(
  items: ImportLaptopItem[],
  opts: { status?: Status } = {}
): Promise<ImportWriteResult> {
  if (items.length === 0) return { ok: true, imported: 0 }

  try {
    const prepared = await Promise.all(
      items.map(async item => {
        const id = deterministicLaptopId(item.data.brand, item.data.model, item.data.variant)
        const slug = await resolveUniqueSlug(slugBase(item.data.brand, item.data.model, item.data.variant), id)
        const brandId = await resolveBrandId(item.data.brand)
        return { item, id, slug, brandId }
      })
    )

    await prisma.$transaction(async tx => {
      const existing = await tx.laptop.findMany({
        where: { id: { in: prepared.map(p => p.id) } },
        select: { id: true, slug: true },
      })
      const oldById = new Map(existing.map(e => [e.id, e.slug] as const))
      for (const { item, id, slug, brandId } of prepared) {
        await tx.laptop.upsert({
          where: { id },
          update: {
            ...toLaptopData(item.data),
            slug,
            brandId,
            ...(opts.status ? { status: opts.status } : {}),
          },
          create: {
            id,
            slug,
            brandId,
            status: opts.status ?? "active",
            ...toLaptopData(item.data),
          },
        })
        // Phase 3: renamed slugs keep a 308 trail (transactional with the write).
        await recordSlugRedirect(tx, id, oldById.get(id) ?? null, slug)
        for (const p of item.prices ?? []) {
          await tx.laptopPrice.upsert({
            where: { laptopId_region_retailer: { laptopId: id, region: p.region, retailer: p.retailer } },
            update: priceData(p),
            create: { laptopId: id, ...priceData(p) },
          })
        }
      }
    })

    invalidateAfterWrite()
    return { ok: true, imported: items.length }
  } catch (err) {
    return { ok: false, ...mapWriteError(err) }
  }
}
