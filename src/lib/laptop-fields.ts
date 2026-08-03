import { z } from "zod"
import { REGION_CODES } from "./regions"

/**
 * Single source of truth for the Laptop edit surface (phase 2b).
 *
 * LAPTOP_FIELDS drives:
 *  - the admin create/edit forms (src/app/admin/laptops/laptop-form.tsx)
 *  - the shared validation schema below (admin actions + bulk import)
 *
 * Deliberately NOT included (managed elsewhere): id, slug (auto-generated from
 * brand-model-variant), status (toggle), createdAt, updatedAt, brandId (derived
 * from brand name), and the API-only PATCH fields (cpuGeneration, cpuBenchmark,
 * gpuVRAM, displayPanelType, displayBrightness, displayColorGamut,
 * batteryCapacity) which stay editable only via PATCH /api/laptops/[id].
 */

export type LaptopFieldType = "string" | "number" | "boolean" | "string-array" | "select"

export interface LaptopFieldDef {
  /** Prisma column name. */
  name: string
  label: string
  type: LaptopFieldType
  /** Valid options for `select` fields. */
  options?: readonly string[]
  required?: boolean
  help?: string
  placeholder?: string
}

export const LAPTOP_FIELDS: readonly LaptopFieldDef[] = [
  { name: "brand", label: "Brand", type: "string", required: true, placeholder: "e.g. Apple, Dell, Lenovo" },
  { name: "model", label: "Model", type: "string", required: true, placeholder: "e.g. MacBook Air M3, XPS 13" },
  { name: "variant", label: "Variant", type: "string", help: "Optional, e.g. 13-inch, i7/16GB" },
  { name: "os", label: "Operating System", type: "string", required: true, placeholder: "macOS, Windows 11 Pro, ChromeOS…" },
  { name: "cpuBrand", label: "CPU Brand", type: "string", required: true, placeholder: "Apple, Intel, AMD, Qualcomm…" },
  { name: "cpuFamily", label: "CPU Family", type: "string", required: true, placeholder: "e.g. Core i7-1360P, Ryzen 7 7840U, M3" },
  { name: "cpuCores", label: "CPU Cores", type: "number" },
  { name: "gpuType", label: "GPU Type", type: "select", options: ["integrated", "dedicated"] },
  { name: "gpuModel", label: "GPU Model", type: "string", placeholder: "e.g. Intel Iris Xe, RTX 4060" },
  { name: "ramAmount", label: "RAM (GB)", type: "number", required: true },
  { name: "ramType", label: "RAM Type", type: "string", placeholder: "LPDDR5, DDR5…" },
  { name: "storageAmount", label: "Storage (GB)", type: "number", required: true },
  { name: "storageType", label: "Storage Type", type: "select", required: true, options: ["SSD", "HDD"] },
  { name: "displaySize", label: "Display Size (inches)", type: "number", required: true },
  { name: "displayResolution", label: "Display Resolution", type: "string", placeholder: "e.g. 2560×1664" },
  { name: "displayRefreshRate", label: "Display Refresh Rate (Hz)", type: "number", help: "Defaults to 60 when empty" },
  { name: "weight", label: "Weight (kg)", type: "number" },
  { name: "batteryLife", label: "Battery Life (hours)", type: "number" },
  { name: "buildMaterial", label: "Build Material", type: "string", placeholder: "e.g. Aluminum, Carbon fiber" },
  { name: "webcamQuality", label: "Webcam Quality", type: "string", placeholder: "e.g. 1080p" },
  { name: "ports", label: "Ports", type: "string-array", help: "Comma-separated, e.g. USB-C ×2, HDMI 2.1, 3.5mm jack" },
  { name: "wireless", label: "Wireless", type: "string", placeholder: "Wi-Fi 6E, Bluetooth 5.3" },
  { name: "securityFeatures", label: "Security Features", type: "string-array", help: "Comma-separated, e.g. Fingerprint reader, TPM 2.0" },
  { name: "ramUpgradeable", label: "RAM Upgradeable", type: "boolean" },
  { name: "storageExpandable", label: "Storage Expandable", type: "boolean" },
  { name: "displayTouch", label: "Touch Display", type: "boolean" },
  { name: "keyboardBacklit", label: "Backlit Keyboard", type: "boolean" },
  { name: "isTouchscreen", label: "Is Touchscreen", type: "boolean" },
  { name: "isRefurbished", label: "Is Refurbished", type: "boolean" },
  { name: "isPopular", label: "Is Popular", type: "boolean" },
  { name: "reviewScore", label: "Review Score", type: "number", help: "0–10 scale" },
  { name: "notes", label: "Notes", type: "string", help: "Free-form notes shown on the detail page" },
  { name: "imageUrl", label: "Image URL", type: "string", help: "https://images.unsplash.com/…" },
]

// ── Zod schema derived from the field list ─────────────────────────────────
// Accepts both native JSON values (bulk import) and FormData string values
// (admin form) via preprocess coercion. Empty strings mean "null" for optional
// fields; missing booleans default to false (matches DB column defaults).

const emptyToNull = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? null : v

const coerceOptionalNumber = (v: unknown): unknown => {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number") return v
  const n = Number(v)
  return Number.isFinite(n) ? n : v // keep original so the schema reports a type error
}

const coerceRequiredNumber = (v: unknown): unknown => {
  if (typeof v === "number") return v
  const n = Number(v)
  return Number.isFinite(n) ? n : v
}

const coerceBoolean = (v: unknown): unknown => {
  if (v === "true" || v === "on" || v === 1) return true
  if (v === "false" || v === "off" || v === 0) return false
  if (typeof v === "boolean") return v
  return v
}

const coerceStringArray = (v: unknown): unknown => {
  if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean)
  return v
}

const optionalString = z.preprocess(emptyToNull, z.string().trim().max(1000).nullable().default(null))
const requiredString = z.preprocess((v: unknown) => (typeof v === "string" ? v.trim() : v), z.string().min(1, "Required").max(1000))
const optionalNumber = z.preprocess(coerceOptionalNumber, z.number("Must be a number").nullable().default(null))
const requiredNumber = z.preprocess(coerceRequiredNumber, z.number("Must be a number").min(0))
const optionalBoolean = z.preprocess(coerceBoolean, z.boolean("Must be true or false").default(false))
const stringArray = z.preprocess(coerceStringArray, z.array(z.string().trim()).max(50).default([]))
const defaultedString = (fallback: string) =>
  z.preprocess(
    v => (v === "" || v === null || v === undefined ? fallback : v),
    z.string().trim().max(1000)
  )

export const LaptopFormSchema = z.object({
  brand: requiredString,
  model: requiredString,
  variant: optionalString,
  os: requiredString,
  cpuBrand: requiredString,
  cpuFamily: requiredString,
  cpuCores: optionalNumber,
  gpuType: defaultedString("integrated"),
  gpuModel: optionalString,
  ramAmount: requiredNumber,
  ramType: optionalString,
  storageAmount: requiredNumber,
  storageType: requiredString,
  displaySize: requiredNumber,
  displayResolution: optionalString,
  displayRefreshRate: optionalNumber.transform(v => v ?? 60),
  weight: optionalNumber,
  batteryLife: optionalNumber,
  buildMaterial: optionalString,
  webcamQuality: optionalString,
  ports: stringArray,
  wireless: optionalString,
  securityFeatures: stringArray,
  ramUpgradeable: optionalBoolean,
  storageExpandable: optionalBoolean,
  displayTouch: optionalBoolean,
  keyboardBacklit: optionalBoolean,
  isTouchscreen: optionalBoolean,
  isRefurbished: optionalBoolean,
  isPopular: optionalBoolean,
  reviewScore: z.preprocess(coerceOptionalNumber, z.number("Must be a number").min(0).max(10).nullable().default(null)),
  notes: optionalString,
  imageUrl: optionalString,
})

export type LaptopFormValues = z.infer<typeof LaptopFormSchema>

// ── Import payload ─────────────────────────────────────────────────────────

export const ImportPriceSchema = z.object({
  region: z.enum(REGION_CODES as [string, ...string[]]),
  retailer: z.string().trim().min(1).max(100),
  // WHOLE currency units (major units), not cents — matches LaptopPrice.price.
  price: z.number("Must be a number").int("Must be a whole number").min(0).max(100_000_000),
  currency: z.string().trim().min(3).max(8).optional(),
  url: z.string().trim().url("Must be a valid URL").max(2048).nullable().optional(),
  affiliateUrl: z.string().trim().url("Must be a valid URL").max(2048).nullable().optional(),
})

export type ImportPriceValues = z.infer<typeof ImportPriceSchema>

// ── Helpers shared by the admin actions and the import route ───────────────

/** Reads LAPTOP_FIELDS out of a FormData (unchecked checkboxes → "false"). */
export function formDataToLaptopValues(fd: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of LAPTOP_FIELDS) {
    const raw = fd.get(field.name)
    if (field.type === "boolean") {
      // Unchecked checkboxes never submit; normalize to a boolean string.
      values[field.name] = raw === null ? "false" : String(raw)
    } else if (raw !== null) {
      values[field.name] = String(raw)
    }
  }
  return values
}

/** Prefills form inputs from a DB row (arrays → comma-separated strings). */
export function laptopToFormValues(laptop: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of LAPTOP_FIELDS) {
    const value = laptop[field.name]
    if (Array.isArray(value)) out[field.name] = value.join(", ")
    else if (value === null || value === undefined) out[field.name] = ""
    else out[field.name] = String(value)
  }
  return out
}

/** First Zod issue as a single human-readable string. */
export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0]
  if (!first) return "Invalid input"
  const path = first.path.length > 0 ? `${first.path.join(".")}: ` : ""
  return `${path}${first.message}`
}
