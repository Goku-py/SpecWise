import { test, expect } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors, seedResults } from "./helpers"
import { SEEDED_RESULTS, SEEDED_COMPARE_IDS } from "./fixtures/results"

/**
 * Results + compare pages. These hydrate from localStorage (previously the
 * source of the /compare hydration mismatch), so seeding BEFORE load asserts
 * both the rendered content and zero console errors (the regression guard).
 */

test.describe("results page", () => {
  test("renders the top match and more options from seeded localStorage", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    seedResults(page, { laptops: SEEDED_RESULTS })

    await page.goto("/results")
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible()
    await expect(page.getByText("Best Match")).toBeVisible()
    await expect(page.getByText("More Options")).toBeVisible()

    // Top match (level-2 heading) + up to 6 "More Options" cards (level-3 headings)
    const main = page.locator("main")
    await expect(main.getByRole("heading", { level: 3 })).toHaveCount(
      Math.min(6, SEEDED_RESULTS.length - 1)
    )
    await expect(main.getByRole("button", { name: "Compare", exact: true })).toHaveCount(
      1 + Math.min(6, SEEDED_RESULTS.length - 1)
    )

    shouldHaveNoConsoleErrors(errors)
  })

  test("with no stored results it routes back to the quiz", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/results")
    await page.waitForURL("**/quiz")
    await expect(page.getByRole("heading", { level: 1, name: "How experienced are you with laptops?" })).toBeVisible()
    shouldHaveNoConsoleErrors(errors)
  })
})

test.describe("compare page", () => {
  test("renders the comparison table for selected ids", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    seedResults(page, { laptops: SEEDED_RESULTS })

    await page.goto(`/compare?ids=${SEEDED_COMPARE_IDS.join(",")}`)
    await expect(page.getByRole("heading", { level: 1, name: "Compare Laptops" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Laptop comparison table, horizontally scrollable" })).toBeVisible()

    // Two model headers
    await expect(page.getByRole("table").getByText("Stealth 14 Studio")).toBeVisible()
    await expect(page.getByRole("table").getByText("Predator Helios 16")).toBeVisible()

    // A sample of the row set renders
    await expect(page.getByRole("table").getByText("Match Score", { exact: true })).toBeVisible()
    await expect(page.getByRole("table").getByText("92%", { exact: true }).first()).toBeVisible()

    // Keyboard-accessible scroll container
    const region = page.getByRole("region", { name: "Laptop comparison table, horizontally scrollable" })
    await expect(region).toHaveAttribute("tabindex", "0")

    shouldHaveNoConsoleErrors(errors)
  })

  test("empty state renders when no results are stored", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/compare?ids=MSI-Stealth-14-Studio")
    await expect(page.getByRole("heading", { level: 2, name: "No results found" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Find Laptops" })).toBeVisible()
    shouldHaveNoConsoleErrors(errors)
  })

  test("hydrates cleanly (regression: old hydration mismatch on first client render)", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    seedResults(page, { laptops: SEEDED_RESULTS })

    await page.goto(`/compare?ids=${SEEDED_COMPARE_IDS[0]}`)
    await expect(page.getByRole("table")).toBeVisible()
    await page.waitForTimeout(500) // let any hydration work finish
    shouldHaveNoConsoleErrors(errors)
  })
})