/**
 * Share helpers (pure, isomorphic) — v3.
 *
 * Share URLs carry the CanonicalProfile v3 as a single base64url JSON payload:
 *   /quiz?s=<base64url>
 * Old-format links (?workload=esports&budget=…) are NOT reinterpreted: they
 * parse as null and the quiz opens empty (fail safe, never silently remapped).
 */
import { CanonicalProfileSchema } from "./recommend/v3/validate";
import type { CanonicalProfile } from "./recommend/v3/types";

export type QuizSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function decodeSharePayload(raw: string): unknown {
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf-8")
        : atob(b64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Parse + validate the `s` query param into a CanonicalProfile.
 * Anything invalid (missing, bad base64, schema-invalid, legacy params) → null.
 */
export function parseV3ShareParams(params: QuizSearchParams): CanonicalProfile | null {
  const raw = first(params.s);
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 8192) return null;
  const parsed = CanonicalProfileSchema.safeParse(decodeSharePayload(raw));
  if (!parsed.success) return null;
  if (parsed.data.workloads.length === 0) return null;
  return parsed.data;
}

/** Build a `/quiz?s=…` path from a profile (omits nothing — the profile is the payload). */
export function buildV3SharePath(profile: CanonicalProfile): string {
  const json = JSON.stringify(profile);
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(json, "utf-8").toString("base64")
      : btoa(json);
  const url = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/quiz?s=${url}`;
}
