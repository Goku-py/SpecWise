"use server"

import { cookies } from "next/headers"
import { getRegion } from "@/lib/regions"

const REGION_COOKIE = "region"
const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Persists the visitor's region selection in a `region` cookie so server
 * components can read it via getRegionFromCookies(). httpOnly stays false so
 * client scripts *could* read it later, but server reads are preferred.
 */
export async function setRegion(code: string): Promise<void> {
  const region = getRegion(code)
  const store = await cookies()
  store.set(REGION_COOKIE, region.code, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: REGION_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}
