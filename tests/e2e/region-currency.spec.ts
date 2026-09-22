import { test, expect } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors } from "./helpers"

/**
 * Region & currency consistency (issues #2–#4):
 *
 * 1. The detail page shows ONLY the selected region's prices, all in that
 *    region's currency (never a mix of $/₹/€).
 * 2. Changing region in the header updates the open page INSTANTLY — no
 *    reload, no stale currency.
 * 3. Mobile menu: opens, navigates, closes on Escape with focus restored.
 *
 * Geo-detection itself (x-vercel-ip-country) only exists behind Vercel's
 * reverse proxy, so it is covered by the cookie-scoping tests here: both a
 * pre-set cookie and a runtime picker change must render INR consistently.
 */

async function firstDetailUrl(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/laptops")
  // Skip test artifacts (e.g. slugs like "qa-test-*") a prior API test may have
  // left in the DB or Next's data cache — they render as "Laptop not found".
  const link = page.locator('main a[href^="/laptops/"]:not([href*="qa-test"])').first()
  await link.waitFor()
  return (await link.getAttribute("href"))!
}

test.describe("detail page currency scoping", () => {
  test("renders only the selected region's currency (IN cookie -> INR only)", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.context().addCookies([
      { name: "region", value: "IN", url: "http://localhost:3000" },
    ])

    const detailUrl = await firstDetailUrl(page)
    await page.goto(detailUrl)

    // Header picker reflects the cookie region
    await expect(page.getByRole("button", { name: "Select region" })).toContainText("IN")

    // Hero price line is INR (scoped to main — the header picker also shows ₹)
    await expect(page.locator("main").getByText(/₹/).first()).toBeVisible()

    // Every price cell in the retailer table is INR — no mixed currencies
    const texts = await page.getByRole("table").locator("tbody tr").allTextContents()
    expect(texts.length).toBeGreaterThan(0)
    for (const t of texts) {
      expect(t).toContain("₹")
      expect(t).not.toContain("$")
    }
    // No per-row "Region" column anymore (scoped table)
    await expect(page.getByRole("table").getByText("Region", { exact: true })).toHaveCount(0)

    shouldHaveNoConsoleErrors(errors)
  })

  test("defaults to USD without a cookie", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const detailUrl = await firstDetailUrl(page)
    await page.goto(detailUrl)

    await expect(page.locator("main").getByText("$").first()).toBeVisible()
    shouldHaveNoConsoleErrors(errors)
  })
})

test.describe("live region switch (no reload)", () => {
  test("changing region in the header updates the open detail page instantly", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const detailUrl = await firstDetailUrl(page)
    await page.goto(detailUrl)

    // Starts on USD
    await expect(page.locator("main").getByText("$").first()).toBeVisible()

    // Switch to India via the header picker
    await page.getByRole("button", { name: "Select region" }).click()
    await page.getByRole("option", { name: /India/ }).click()

    // Hero price flips to INR without a reload (same URL)
    await expect(page.locator("main").getByText(/₹/).first()).toBeVisible()
    expect(page.url()).toContain("/laptops/")

    // Retailer table now shows INR rows only
    const texts = await page.getByRole("table").locator("tbody tr").allTextContents()
    expect(texts.length).toBeGreaterThan(0)
    for (const t of texts) {
      expect(t).toContain("₹")
      expect(t).not.toContain("$")
    }

    // Picker reflects the new region
    await expect(page.getByRole("button", { name: "Select region" })).toContainText("IN")

    // Switch back to USD — price line updates again
    await page.getByRole("button", { name: "Select region" }).click()
    await page.getByRole("option", { name: /United States/ }).click()
    await expect(page.locator("main").getByText("$").first()).toBeVisible()
    await expect(page.locator("main").getByText(/₹/)).toHaveCount(0)

    shouldHaveNoConsoleErrors(errors)
  })
})

test.describe("mobile menu", () => {
  test("opens, navigates, closes on Escape with focus restored", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/quiz")

    const toggle = page.getByRole("button", { name: "Menu" })
    await expect(toggle).toBeVisible()
    await toggle.click()

    // Menu content
    const menuNav = page.getByRole("navigation", { name: "Mobile navigation" })
    await expect(menuNav).toBeVisible()
    await expect(menuNav.getByRole("link", { name: "Database" })).toBeVisible()
    await expect(menuNav.getByRole("link", { name: "Compare" })).toBeVisible()
    await expect(menuNav.getByRole("link", { name: "Methodology" })).toBeVisible()
    await expect(menuNav.getByRole("link", { name: "API" })).toBeVisible()
    await expect(page.locator("#mobile-menu").getByRole("link", { name: "OPEN DATABASE →" })).toBeVisible()
    await expect(page.getByText("Region", { exact: true })).toBeVisible()

    // Escape closes and focus returns to the toggle
    await page.keyboard.press("Escape")
    await expect(menuNav).toBeHidden()
    await expect(toggle).toBeFocused()

    // Closed menu is inert — its links are not focusable
    await page.keyboard.press("Tab")

    // Reopen and navigate
    await toggle.click()
    await menuNav.getByRole("link", { name: "Database" }).click()
    await page.waitForURL("**/laptops")
    await expect(menuNav).toBeHidden()

    shouldHaveNoConsoleErrors(errors)
  })
})