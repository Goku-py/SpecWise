import { test, expect } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors, seedV3Results } from "./helpers"

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
    await expect(page.getByRole("heading", { level: 1, name: "Your best match" })).toBeVisible()
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
  test("empty state renders when no ids are selected", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/compare")
    await expect(page.getByRole("heading", { level: 1, name: "Compare laptops" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "No laptops selected" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Take the quiz" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Browse laptops" }).first()).toBeVisible()
    shouldHaveNoConsoleErrors(errors)
  })

  test("unknown ids render an honest not-listed state", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    // Clearly-fake ids never resolve from the catalog, with or without a DB.
    await page.goto("/compare?ids=no-such-laptop-aaa,no-such-laptop-bbb")
    await expect(page.getByRole("heading", { level: 1, name: "Compare laptops" })).toBeVisible()
    await expect(page.getByText("Not listed: no-such-laptop-aaa, no-such-laptop-bbb")).toBeVisible()
    shouldHaveNoConsoleErrors(errors)
  })

  test("hydrates cleanly (regression: old hydration mismatch on first client render)", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/compare")
    await expect(page.getByRole("heading", { level: 1, name: "Compare laptops" })).toBeVisible()
    await page.waitForTimeout(500) // let any hydration work finish
    shouldHaveNoConsoleErrors(errors)
  })
})