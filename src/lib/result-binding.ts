/**
 * Profile↔result binding (Phase 5 — refine-and-rerun).
 *
 * Pure, client-safe, zero new deps. The quiz submit path writes one binding
 * record for the EXACT profile POSTed; the results view compares the stored
 * profile's fingerprint against it. The fingerprint is integrity-tamper-
 * evident for binding only, NOT security (FNV-1a, non-crypto).
 */
import type { CanonicalProfile } from "@/lib/recommend/v3/types";
import {
  defaultBackend,
  readValidated,
  removeStored,
  StorageKey,
  writeValidated,
  type StorageBackend,
} from "@/lib/storage";

/** Binding payload: fingerprint of the profile the results were scored from. */
export interface StoredBinding {
  fingerprint: string;
}

/** Total validator: non-empty fingerprint string, nothing else required. */
export function validateBinding(u: unknown): StoredBinding | null {
  if (typeof u !== "object" || u === null) return null;
  const fp = (u as Record<string, unknown>).fingerprint;
  if (typeof fp !== "string" || fp.length === 0) return null;
  return { fingerprint: fp };
}

/**
 * Recursively sort object keys so key order never affects the fingerprint.
 * Arrays keep order (order is semantically meaningful there).
 */
function canonicalize(u: unknown): unknown {
  if (Array.isArray(u)) return u.map(canonicalize);
  if (typeof u === "object" && u !== null) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(u).sort()) {
      const v = (u as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = canonicalize(v);
    }
    return out;
  }
  return u;
}

/** FNV-1a 32-bit hash → 8-char hex. Non-crypto; binding integrity only. */
function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Stable fingerprint of a profile: sorted-key JSON + FNV-1a hex. */
export function fingerprintProfile(profile: CanonicalProfile): string {
  return fnv1aHex(JSON.stringify(canonicalize(profile)));
}

/**
 * Write the binding for the EXACT profile POSTed. Overwrites any prior
 * binding, so a re-submit can never present old results as new.
 */
export function writeBinding(
  profile: CanonicalProfile,
  backend: StorageBackend | null = defaultBackend(),
): void {
  writeValidated(
    StorageKey.Binding,
    { fingerprint: fingerprintProfile(profile) },
    backend,
  );
}

/** Read the binding; null when absent or schema-invalid (pre-Phase-5 results). */
export function readBinding(
  backend: StorageBackend | null = defaultBackend(),
): StoredBinding | null {
  return readValidated(StorageKey.Binding, validateBinding, backend);
}

/** Clear the binding (Start over flows). */
export function clearBinding(
  backend: StorageBackend | null = defaultBackend(),
): void {
  removeStored(StorageKey.Binding, backend);
}

export type BindingState = "bound" | "stale" | "unbound";

/**
 * bound: stored profile fingerprints to the binding (results are current).
 * stale: binding exists but profile missing/mismatched (answers changed).
 * unbound: no binding (pre-Phase-5 results) — callers keep current behavior.
 */
export function bindingStateFor(
  storedProfile: unknown,
  binding: StoredBinding | null,
): BindingState {
  if (!binding) return "unbound";
  if (typeof storedProfile !== "object" || storedProfile === null)
    return "stale";
  return fingerprintProfile(storedProfile as CanonicalProfile) ===
    binding.fingerprint
    ? "bound"
    : "stale";
}
