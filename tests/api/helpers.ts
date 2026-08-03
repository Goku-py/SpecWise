/**
 * Shared helpers for the live-server API integration tests (tests/api).
 *
 * Env is loaded explicitly here: the app reads ADMIN_API_KEY / DATABASE_URL
 * from .env at module load (src/lib/prisma.ts, src/lib/admin-auth.ts), and
 * vitest does not load dotenv by itself. `import "dotenv/config"` must be the
 * first import so `adminKey` below sees the real value.
 */
import "dotenv/config"
import { deleteLaptop } from "@/lib/db/catalog"

export { deleteLaptop }

export const apiBase: string = process.env.API_BASE ?? "http://localhost:3000"

/** Admin API key from .env. NEVER log or print this value. */
export const adminKey: string = process.env.ADMIN_API_KEY ?? ""

// Per-process random octet so re-runs within the same 60s rate-limit window
// never collide with a previous run's buckets; per-call counter keeps every
// request of a run on its own unique X-Forwarded-For value.
const ipBase: number = 100 + Math.floor(Math.random() * 100)
let ipSeq = 0

/** Deterministic-ish unique X-Forwarded-For value for one request/suite. */
export function uniqueIp(): string {
  ipSeq += 1
  return `200.${ipBase}.${Math.floor(ipSeq / 250)}.${(ipSeq % 250) + 1}`
}

export interface ApiResponse<T = unknown> {
  status: number
  headers: Headers
  body: T
}

/**
 * Fetch helper: parses JSON, returns status + headers + parsed body.
 * `opts` is a standard RequestInit; callers add method/body/headers.
 *
 * Transient 5xx handling: the dev DB is Neon, which periodically terminates
 * connections ("terminating connection due to administrator command") and the
 * dev server answers 500 for that single request. Requests that fail the
 * fetch (network/ECONNRESET) or return 5xx are retried once after a short
 * delay. Rate-limited buckets key on the X-Forwarded-For header, so a retried
 * request still charges the same bucket — counts stay exact.
 */
export async function getJson<T = unknown>(
  url: string,
  opts: RequestInit = {}
): Promise<ApiResponse<T>> {
  const MAX_ATTEMPTS = 2
  const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch(url, opts)
    } catch {
      // Network-level failure (e.g. ECONNRESET from Neon connection churn).
      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(200)
        continue
      }
      throw new Error(`getJson: fetch failed for ${url}`)
    }

    const text = await res.text()
    let body: T
    try {
      body = text.length > 0 ? (JSON.parse(text) as T) : ({} as T)
    } catch {
      body = {} as T
    }
    const parsed: ApiResponse<T> = { status: res.status, headers: res.headers, body }

    // Transient server 5xx (Neon "terminating connection"): retry once.
    if (parsed.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
      await delay(200)
      continue
    }
    return parsed
  }

  throw new Error(`getJson: unreachable after ${MAX_ATTEMPTS} attempts for ${url}`)
}

/** Headers for an anonymous request from a given spoofed client IP. */
export function xffHeader(ip: string): Record<string, string> {
  return { "x-forwarded-for": ip }
}

/** Headers with the admin Bearer key for a given spoofed client IP. */
export function bearerHeaders(ip: string): Record<string, string> {
  return { authorization: `Bearer ${adminKey}`, "x-forwarded-for": ip }
}

/**
 * Rate-limit buckets are fixed 60-second windows (floor(now/60)*60). A
 * 61-request hammer only ever trips the limit if every request lands in the
 * SAME window, so before hammering we wait until the next window boundary
 * (+1s buffer). Fast path: return immediately when >= 45s remain in the
 * current window (a hammer takes well under that).
 */
export async function alignRateLimitWindow(): Promise<void> {
  const remaining = 60_000 - (Date.now() % 60_000)
  if (remaining >= 45_000) return
  await new Promise(resolve => setTimeout(resolve, remaining + 1_000))
}
