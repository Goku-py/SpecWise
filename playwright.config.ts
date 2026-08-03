import { defineConfig } from "@playwright/test"

/**
 * Playwright e2e config (Phase 4c).
 *
 * Deliberately conservative knobs:
 *  - workers: 1 / fullyParallel: false — the whole suite shares ONE dev server
 *    and a per-IP rate-limit budget (POST /api/quiz is limited to 60/min/IP and
 *    the browser cannot spoof X-Forwarded-For).
 *  - retries: 0 — the suite must be green first time; a retry would double the
 *    rate-limited quiz POSTs.
 *  - testDir: tests/e2e — the vitest config only includes tests/**\/*.test.ts,
 *    so the .spec.ts files here are exclusively Playwright's.
 *  - webServer reuses the already-running dev server on localhost:3000.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
})
