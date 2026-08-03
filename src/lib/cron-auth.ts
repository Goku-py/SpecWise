import crypto from "crypto"

/**
 * src/lib/cron-auth.ts — Bearer-token verification for cron endpoints.
 * Mirrors src/lib/admin-auth.ts (same timingSafeEqual pattern) but takes the
 * expected secret as an argument so callers decide WHICH env var gates them
 * (the price-sync cron uses CRON_SECRET).
 */

/**
 * Constant-time check of `Authorization: Bearer <token>` against `expected`.
 * False on any mismatch (missing header, wrong scheme, length mismatch, or
 * unexpected non-string token values) — never throws.
 */
export function verifyBearerToken(request: Request, expected: string): boolean {
  const header = request.headers.get("Authorization") ?? ""
  const match = header.match(/^Bearer\s+(.+)$/)
  if (!match) return false

  const token = match[1]
  try {
    const expectedBuf = Buffer.from(expected)
    const actualBuf = Buffer.from(token)
    if (expectedBuf.length !== actualBuf.length) return false
    return crypto.timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    return false
  }
}
