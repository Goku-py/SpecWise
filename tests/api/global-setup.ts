/**
 * Vitest global setup for the live-server API integration tests (tests/api).
 *
 * The dev server is Turbopack, whose cold compiles can take longer than
 * Vitest's default per-test timeout, so the first request against any route
 * used to die with a confusing fetch failure. Here we wait for the server to
 * come up (up to ~30s), then warm every route the suite hits so the first
 * test never waits on a cold compile.
 *
 * Env is loaded explicitly first (vitest does not load dotenv by itself).
 */
import "dotenv/config"

const apiBase: string = process.env.API_BASE ?? "http://localhost:3000"

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * One warm-up request. Unique X-Forwarded-For keeps the rate-limit buckets
 * unpolluted. 4xx/5xx responses are expected (the suite asserts on them) and
 * still prove the route compiled — only a failed fetch is fatal here.
 */
async function warmRoute(url: string, init: RequestInit = {}): Promise<void> {
  try {
    await fetch(url, {
      ...init,
      headers: {
        "x-forwarded-for": "200.199.1.1",
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new Error(`global-setup: warm-up fetch failed for ${url}`)
  }
}

export default async function setup(): Promise<void> {
  // Unit-only runs (no API suite) skip warm-up: SKIP_API_WARMUP=1 vitest run …
  if (process.env.SKIP_API_WARMUP === "1") return
  // Wait for the dev server to come up: 30 tries x 1s. Any HTTP response
  // (even a 5xx) means the server is reachable.
  let up = false
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await fetch(`${apiBase}/api/health`)
      up = true
      break
    } catch {
      // Not up yet — keep polling.
    }
    await sleep(1000)
  }
  if (!up) {
    throw new Error(
      `API server not reachable at ${apiBase}/api/health — start it with \`npm run dev\` before running tests/api`
    )
  }

  // Warm every route the API suite hits, in the same shape the tests use.
  await warmRoute(`${apiBase}/api/laptops?region=US`)
  await warmRoute(`${apiBase}/api/laptops/search?q=mac`)
  await warmRoute(`${apiBase}/api/quiz`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  await warmRoute(`${apiBase}/api/laptops/warmup-nonexistent`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  await warmRoute(`${apiBase}/api/admin/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
}