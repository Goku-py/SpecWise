import { test, expect } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors } from "./helpers"

/**
 * Catalog -- server-rendered laptops page (ISR) with client search island.
 * Asserts SSR'd content is present before hydration (SEO regression) and that
 * the debounced search still narrows results.
 */

test.describe("catalog page", () => {
  test("server-renders the catalog grid with slug links and no console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/laptops")
    await expect(page.getByRole("heading", { level: 1, name: "Browse Laptops" })).toBeVisible()

    // SSR content visible without client data-fetch (this is the SEO fix)
    await expect(page.getByText(/laptops found/i)).toBeVisible()
    const cardLinks = page.locator("main a[href^='/laptops/']")
    await expect(cardLinks.first()).toBeVisible()
    const href = await cardLinks.first().getAttribute("href")
    expect(href).toMatch(/^\/laptops\//)
    // Slug links (no spaces / percent-encoded ids) after Phase 2a
    expect(href).not.toContain("%20")
    expect(href).not.toContain(" ")

    shouldHaveNoConsoleErrors(errors)
  })

  test("search narrows the grid after a debounce", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/laptops")
    const input = page.getByPlaceholder("Search by brand or model…")
    await expect(input).toBeVisible()

    await input.fill("MacBook")
    await expect(page.getByText(/laptops found/)).toHaveText(/^\d+ laptops found$/)
    await page.waitForTimeout(600) // debounce 300ms + fetch

    const cardLinks = page.locator("main a[href^='/laptops/']")
    await expect(cardLinks.first()).toBeVisible()
    const count = await cardLinks.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(56)

    shouldHaveNoConsoleErrors(errors)
  })

  test("unknown search returns the empty state without crashing", async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto("/laptops")
    await page.getByPlaceholder("Search by brand or model…").fill("zzz-no-such-laptop")
    await page.waitForTimeout(700)

    await expect(page.getByRole("heading", { level: 3, name: "No laptops found" })).toBeVisible()
    shouldHaveNoConsoleErrors(errors)
  })
})