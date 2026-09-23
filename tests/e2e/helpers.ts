import { expect, type Page } from "@playwright/test"
import type { QuizAnswers, RecommendedLaptop } from "../../src/lib/types"
import { SEEDED_QUIZ_ANSWERS, SEEDED_RESULTS } from "./fixtures/results"

/**
 * e2e helpers (Phase 4c).
 *
 * 1. collectConsoleErrors — permanently catches hydration mismatches and
 *    runtime errors: every `console.error` plus every uncaught `pageerror` is
 *    recorded. The old /compare hydration bug would have failed
 *    shouldHaveNoConsoleErrors on every affected page.
 *
 *    Environment noise is filtered: failed subresource loads (images, fonts)
 *    and aborted/blocked requests log "Failed to load resource: net::ERR_*"
 *    console errors when the headless browser can't reach external hosts
 *    (Unsplash images, ipapi geo-detection). Those are not app bugs, so they
 *    are excluded; hydration mismatches and React/runtime errors are not.
 *
 * 2. seedResults — writes the stored-state keys into localStorage BEFORE page
 *    load via addInitScript, so the client components read them on first
 *    mount. This makes the seeded /results and /compare tests free of any
 *    rate-limited API call.
 */

const NETWORK_NOISE_PATTERNS: RegExp[] = [
  /Failed to load resource/i,
  /net::err_/i,
  /ERR_CONNECTION/i,
  /ERR_NAME_NOT_RESOLVED/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /ERR_BLOCKED_BY_CLIENT/i,
  /The connection was reset/i,
  // External hosts (ipapi.co geo fallback, etc.) reject cross-origin fetches
  // from the headless browser; the app's own API calls are same-origin, so a
  // CORS-blocked fetch is always third-party environment noise, not an app bug.
  /blocked by CORS policy/i,
]

function isNetworkNoise(text: string): boolean {
  return NETWORK_NOISE_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * Start recording console errors + page errors on `page`. Returns the array
 * the test asserts on at the end via shouldHaveNoConsoleErrors.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error" && !isNetworkNoise(msg.text())) {
      errors.push(`console.error: ${msg.text()}`)
    }
  })
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`)
  })
  return errors
}

/**
 * Assert zero recorded console/page errors. Failures print the collected
 * messages so a hydration mismatch or runtime crash is visible in the report.
 */
export function shouldHaveNoConsoleErrors(errors: readonly string[]): void {
  expect(
    errors,
    "expected zero console errors / page errors — hydration mismatches and runtime crashes surface here"
  ).toEqual([])
}

export interface SeedResultsOptions {
  /** Override the default 3-laptop fixture. */
  laptops?: RecommendedLaptop[]
  /** Override the stored quiz answers. Defaults to SEEDED_QUIZ_ANSWERS. */
  answers?: QuizAnswers
  /** Region stored in specwise-region / answers; defaults to "US". */
  region?: string
}

/**
 * Seed the stored-state keys (specwise-results / specwise-answers /
 * specwise-region) BEFORE the page script runs. Call before page.goto().
 */
export function seedResults(page: Page, options: SeedResultsOptions = {}): void {
  const laptops = options.laptops ?? SEEDED_RESULTS
  const region = options.region ?? "US"
  const answers: QuizAnswers = options.answers ?? { ...SEEDED_QUIZ_ANSWERS, region }
  const payload = { results: laptops, total: laptops.length }

  page.addInitScript(
    ({ resultsJson, answersJson, regionCode }) => {
      localStorage.setItem("specwise-results", resultsJson)
      localStorage.setItem("specwise-answers", answersJson)
      localStorage.setItem("specwise-region", regionCode)
    },
    {
      resultsJson: JSON.stringify(payload),
      answersJson: JSON.stringify(answers),
      regionCode: region,
    }
  )
}

/**
 * Seed the v3 results DTO (specwise-v3-results) BEFORE the page script runs.
 * Minimal items satisfy validateV3Results; specs feed the rendered cards.
 */
export function seedV3Results(page: Page, count = 3): void {
  const items = Array.from({ length: count }, (_, i) => ({
    laptopId: `v3-seed-${i}`,
    brand: "SeedBrand",
    model: `SeedModel ${i}`,
    variant: null,
    price: 1000 + i * 100,
    currency: "USD",
    priceStale: false,
    priceMissing: false,
    scores: { overall: 90 - i * 5, W: 0.9, C: 1, V: 0.5 },
    confidence: "high",
    confidenceFactors: [],
    dataCompleteness: 1,
    strengths: [{ dim: "ram", evidence: "16 GB RAM" }],
    compromises: ["build"],
    missedPreferred: [],
    whyAbove: null,
    capabilities: { ram: 0.8 },
    specs: { ramGB: 16, storageGB: 512, os: "windows", weightKg: 1.5, refreshHz: 60 },
  }));
  const dto = {
    schemaVersion: "v3",
    scoringVersion: "v3.1",
    weightsVersion: "v3.1",
    region: "US",
    currency: "USD",
    relaxed: false,
    exhausted: false,
    awaitingUser: false,
    relaxationLedger: [],
    items,
    contradictions: [],
    notes: [],
  };
  page.addInitScript(
    ({ dtoJson }) => {
      localStorage.setItem("specwise-v3-results", dtoJson);
    },
    { dtoJson: JSON.stringify(dto) }
  );
}

/**
 * Clear every SpecWise localStorage key (used where a test must start from a
 * pristine state on top of a page that already loaded).
 */
export function clearSpecwiseStorage(page: Page): void {
  void page.evaluate(() => {
    localStorage.removeItem("specwise-results")
    localStorage.removeItem("specwise-answers")
    localStorage.removeItem("specwise-region")
    localStorage.removeItem("specwise-v3-results")
    localStorage.removeItem("specwise-v3-profile")
  })
}
