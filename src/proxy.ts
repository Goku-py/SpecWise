import { NextResponse, type NextRequest } from "next/server"
import { REGION_CODES } from "@/lib/regions"

export const REGION_COOKIE = "region"
const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Server-side region detection (replaces the CSP-blocked client ipapi.co
 * fetch — it never worked in production).
 *
 * On the first visit (no `region` cookie), derive the country from the
 * reverse-proxy geo header (`x-vercel-ip-country` on Vercel, `cf-ipcountry`
 * on Cloudflare) and persist it as a cookie so every server read — header,
 * catalog, quiz, API routes — agrees with the client store.
 *
 * Manual selection always wins: once the cookie exists (set here or by the
 * `setRegion` server action), this middleware is a no-op.
 *
 * Local dev has no geo headers, so the cookie is never written and the
 * default "US" applies consistently to every device on localhost.
 */
export default function proxy(request: NextRequest) {
  if (request.cookies.has(REGION_COOKIE)) return NextResponse.next()

  const country = (
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("cloudfront-viewer-country") ??
    ""
  ).toUpperCase()

  if (country && REGION_CODES.includes(country)) {
    const response = NextResponse.next()
    response.cookies.set(REGION_COOKIE, country, {
      path: "/",
      sameSite: "lax",
      maxAge: REGION_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
      // Not httpOnly: the client region store reads it to keep every price in
      // sync with the server without an extra round-trip.
      httpOnly: false,
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  // Skip static assets / images / font / metadata files; everything else
  // (pages + API) is region-relevant.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
}
