import crypto from "crypto"

const ADMIN_API_KEY = process.env.ADMIN_API_KEY

export function verifyAdminApiKey(request: Request): boolean {
  if (!ADMIN_API_KEY) return false

  const header = request.headers.get("Authorization") ?? ""
  const match = header.match(/^Bearer\s+(.+)$/)
  if (!match) return false

  const token = match[1]
  try {
    const expected = Buffer.from(ADMIN_API_KEY)
    const actual = Buffer.from(token)
    if (expected.length !== actual.length) return false
    return crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}
