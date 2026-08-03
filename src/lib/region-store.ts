import { useSyncExternalStore } from "react"
import { getRegion, REGION_CODES, type RegionConfig } from "./regions"
import { setRegion } from "@/app/actions"

/**
 * Client-side region store — the single source of truth for the visitor's
 * region on the client, mirrored by the `region` cookie on the server.
 *
 * Why this exists: region/currency changes must propagate INSTANTLY across
 * client-rendered pricing (detail page, picker) without a full reload, while
 * server components (catalog grid, quiz, results) stay in sync via the cookie
 * + router.refresh().
 *
 * Hydration safety: every consumer renders its SERVER-provided region during
 * SSR/hydration (getServerSnapshot) and only switches to the cookie-truth
 * after mount — the same sentinel pattern the /compare page uses, so there is
 * never a hydration mismatch.
 */

const REGION_COOKIE = "region"

/** Cache of the last seen cookie value; invalidated by setClientRegion(). */
let currentCode: string | null = null

const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

function readCookieCode(): string | null {
  if (typeof document === "undefined") return null
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(`${REGION_COOKIE}=`)) {
      const code = part.slice(REGION_COOKIE.length + 1)
      return REGION_CODES.includes(code) ? code : null
    }
  }
  return null
}

/** Client snapshot: cookie value (or "US" when unset). Stable by reference —
 * getRegion() returns the shared RegionConfig instance. */
function getSnapshot(): RegionConfig {
  if (currentCode === null) currentCode = readCookieCode()
  return getRegion(currentCode ?? "US")
}

/**
 * Subscribe to the live region. Renders `serverRegion` until hydration
 * completes, then follows the client store — so the first paint always
 * matches the server HTML while every subsequent region change re-renders
 * this component instantly.
 */
export function useClientRegion(serverRegion: RegionConfig): RegionConfig {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverRegion)
}

/**
 * Change the region: optimistic client update (instant re-render of every
 * subscriber) + persist the cookie via the server action. Callers invoke
 * router.refresh() afterwards so server-rendered region data catches up.
 */
export async function setClientRegion(code: string): Promise<void> {
  currentCode = code
  for (const listener of listeners) listener()
  await setRegion(code)
}
