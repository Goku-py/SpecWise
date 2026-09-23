/**
 * Versioned localStorage envelope (Phase 3 strangler).
 *
 * Contract:
 * - All writes go out as a v2 envelope: { v: 2, savedAt, data }.
 * - Reads accept v2 envelopes AND legacy raw payloads (one-release compat).
 * - A successfully validated legacy payload is migrated to v2 on read
 *   (idempotent: the next read already sees v2).
 * - Malformed JSON / schema-invalid data read as null; callers keep their
 *   existing safe behavior (quiz gate, defaults, empty states). Stored bytes
 *   are never deleted by a read.
 * - localStorage is never authoritative: the server revalidates on submit.
 *
 * The module never touches `window` at import time. All access flows through
 * an injectable backend so unit tests run in Node with an in-memory Map.
 */
import type { RecommendedLaptop } from "./types"

export const STORAGE_VERSION = 2 as const

export const StorageKey = {
  Results: "specwise-results",
  V3Results: "specwise-v3-results",
  V3Profile: "specwise-v3-profile",
} as const

export type StorageKeyName = (typeof StorageKey)[keyof typeof StorageKey]

export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface V2Envelope<T> {
  v: typeof STORAGE_VERSION
  savedAt: string
  data: T
}

/** Null when there is no DOM storage (SSR) — callers treat as absent. */
export function defaultBackend(): StorageBackend | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

function readRaw(key: string, backend: StorageBackend | null): string | null {
  if (!backend) return null
  try {
    return backend.getItem(key)
  } catch {
    return null
  }
}

function isPlainObject(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null && !Array.isArray(u)
}

function isV2Envelope(u: unknown): u is V2Envelope<unknown> {
  return (
    isPlainObject(u) &&
    (u as Record<string, unknown>).v === STORAGE_VERSION &&
    typeof (u as Record<string, unknown>).savedAt === "string" &&
    "data" in u
  )
}

/**
 * Parse one stored value. Returns null when missing or malformed JSON.
 * Otherwise `{ version: 2, data }` for envelopes or `{ version: 1, data }`
 * for legacy raw payloads.
 */
export function readEnvelope(
  key: string,
  backend: StorageBackend | null = defaultBackend()
): { version: 1 | 2; data: unknown } | null {
  const raw = readRaw(key, backend)
  if (raw == null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (isV2Envelope(parsed)) return { version: 2, data: parsed.data }
  return { version: 1, data: parsed }
}

function writeEnvelope<T>(
  key: string,
  data: T,
  backend: StorageBackend | null
): void {
  if (!backend) return
  try {
    const envelope: V2Envelope<T> = {
      v: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    }
    backend.setItem(key, JSON.stringify(envelope))
  } catch {
    // Quota / private-mode failures must never break the UI.
  }
}

/**
 * Read + validate. Legacy payloads that validate are migrated to v2
 * (idempotent). Anything else reads as null.
 */
export function readValidated<T>(
  key: string,
  validate: (u: unknown) => T | null,
  backend: StorageBackend | null = defaultBackend()
): T | null {
  const found = readEnvelope(key, backend)
  if (!found) return null
  const value = validate(found.data)
  if (value == null) return null
  if (found.version === 1) writeEnvelope(key, value, backend)
  return value
}

/** Write through the v2 envelope. */
export function writeValidated<T>(
  key: string,
  data: T,
  backend: StorageBackend | null = defaultBackend()
): void {
  writeEnvelope(key, data, backend)
}

export function removeStored(
  key: string,
  backend: StorageBackend | null = defaultBackend()
): void {
  if (!backend) return
  try {
    backend.removeItem(key)
  } catch {
    // Ignore removal failures; absence is handled by readers.
  }
}

// ── Validators ─────────────────────────────────────────────────────────────

/** v3 profile blob: schemaVersion + workloads passthrough (server revalidates). */
export function validateV3Profile(u: unknown): Record<string, unknown> | null {
  if (!isPlainObject(u)) return null
  if (u.schemaVersion !== "v3" || !Array.isArray(u.workloads)) return null
  return { ...u }
}

function isValidV3Item(u: unknown): boolean {
  if (!isPlainObject(u)) return false
  if (typeof u.laptopId !== "string" || u.laptopId.length === 0) return false
  if (!isPlainObject(u.scores) || typeof u.scores.overall !== "number") return false
  return Number.isFinite(u.scores.overall)
}

/** v3 results DTO: schemaVersion + items with scores. Server is authoritative. */
export function validateV3Results(u: unknown): Record<string, unknown> | null {
  if (!isPlainObject(u)) return null
  if (u.schemaVersion !== "v3" || !Array.isArray(u.items)) return null
  if (!(u.items as unknown[]).every(isValidV3Item)) return null
  return { ...u }
}

function isValidResultItem(u: unknown): u is RecommendedLaptop {
  if (!isPlainObject(u)) return false
  if (typeof u.id !== "string" || u.id.length === 0) return false
  return typeof u.matchScore === "number" && Number.isFinite(u.matchScore)
}

/** `{ results: [...] }` with per-item id + finite matchScore. */
export function validateResultsPayload(
  u: unknown
): { results: RecommendedLaptop[] } | null {
  if (!isPlainObject(u) || !Array.isArray(u.results)) return null
  if (!u.results.every(isValidResultItem)) return null
  return { results: u.results as RecommendedLaptop[] }
}

/**
 * Canonical JSON snapshot string for string-based readers (compare flow).
 * v2 envelopes with valid payloads serialize their data; legacy raw passes
 * through byte-identical (callers keep their existing try/catch paths, so
 * corrupt-data behavior is unchanged); malformed JSON also passes through
 * untouched for the same reason. Null only when the key is absent.
 */
export function readResultsSnapshot(
  backend: StorageBackend | null = defaultBackend()
): string | null {
  const raw = readRaw(StorageKey.Results, backend)
  if (raw == null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return raw
  }
  if (!isV2Envelope(parsed)) return raw
  if (validateResultsPayload(parsed.data) == null) return null
  return JSON.stringify(parsed.data)
}
