import { cookies } from "next/headers"
import { getRegion, type RegionConfig } from "./regions"

export const REGION_COOKIE = "region"

/**
 * Server-only region helper. Reads the `region` cookie (written by the
 * `setRegion` server action or geo-detection in src/middleware.ts), validates
 * it against the known regions and falls back to "US" when the cookie is
 * missing or invalid.
 */
export async function getRegionFromCookies(): Promise<RegionConfig> {
  const store = await cookies()
  return getRegion(store.get(REGION_COOKIE)?.value ?? "US")
}
