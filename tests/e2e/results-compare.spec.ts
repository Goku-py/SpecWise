import { test, expect } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors, seedResults, seedV3Results } from "./helpers"
import { SEEDED_RESULTS, SEEDED_COMPARE_IDS } from "./fixtures/results"

/**
 * Results (v3 DTO) + compare pages. Results hydrates the v3 DTO from
 * localStorage; compare hydrates its own legacy pool the same way, so seeding
 * BEFORE load asserts both the rendered content and zero console errors.
 */

test.describe("results page", () => {
  test("renders the top match and more options from seeded v3 DTO", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    seedV3Results(page, 3)

    await page.goto("/results")
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible()
    await expect(page.getByText("Best match")).toBeVisible()
    await expect(page.getByText("More options")).toBeVisible()
    await expect(page.getByTestId("top-specs")).toBeVisible()
    await expect(page.getByTestId("item-specs")).toHaveCount(2)

    shouldHaveNoConsoleErrors(errors)
  })

  test("with no stored results it routes back to the quiz", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/results")
    await page.waitForURL("**/quiz")
    // /quiz renders the v3 Quick quiz directly — Q1 (Workload) is shown
    // immediately; there is no gate/mode picker.
    await expect(
      page.getByRole("heading", { level: 2, name: "What will you mainly use this laptop for?" })
    ).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Quiz progress" })).toContainText("Workload")
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