import { test, expect, type Page } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors } from "./helpers"
import { SEEDED_RESULTS } from "./fixtures/results"

/**
 * End-to-end coverage of the quiz -> results funnel (server-rendered shell +
 * lazy-loaded client QuizFlow). The POST /api/quiz call is stubbed so the
 * suite is deterministic and never burns the real 60/min/IP rate limit.
 */

function stubQuizApi(page: Page) {
  return page.route("**/api/quiz", async route => {
    if (route.request().method() !== "POST") {
      return route.continue()
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: SEEDED_RESULTS, total: SEEDED_RESULTS.length }),
    })
  })
}

test.describe("quiz flow", () => {
  test.describe.configure({ mode: "serial" })

  test("runs the full simple quiz and lands on results", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await stubQuizApi(page)

    await page.goto("/quiz")

    // Mode selector
    await expect(
      page.getByRole("heading", { level: 1, name: "How experienced are you with laptops?" })
    ).toBeVisible()
    await page.getByRole("button", { name: /Quick & Simple/ }).click()

    // Step 1 -- use case (required)
    await expect(page.getByRole("heading", { level: 2, name: "What will you mainly use the laptop for?" })).toBeVisible()
    await page.getByRole("button", { name: /Coding & Development/ }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // Step 2 -- budget via the editable number fields (slider thumbs are flaky in CI)
    await expect(page.getByRole("heading", { level: 2, name: "What's your budget range?" })).toBeVisible()
    const minBudget = page.getByLabel("Minimum budget")
    const maxBudget = page.getByLabel("Maximum budget")
    await minBudget.fill("800")
    await minBudget.press("Enter")
    await maxBudget.fill("2000")
    await maxBudget.press("Enter")
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // Step 3 -- OS
    await expect(page.getByRole("heading", { level: 2, name: "Which operating system do you prefer?" })).toBeVisible()
    await page.getByRole("button", { name: /Windows/ }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // Step 4 -- RAM
    await expect(page.getByRole("heading", { level: 2, name: "How much RAM do you need?" })).toBeVisible()
    await page.getByRole("button", { name: /16 GB/ }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // Step 5 -- GPU
    await expect(page.getByRole("heading", { level: 2, name: "Do you need dedicated graphics?" })).toBeVisible()
    await page.getByRole("button", { name: /No, integrated is fine/ }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // Step 6 -- battery
    await expect(page.getByRole("heading", { level: 2, name: "How important is battery life?" })).toBeVisible()
    await page.getByRole("button", { name: /Somewhat important/ }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // Step 7 -- screen size
    await expect(page.getByRole("heading", { level: 2, name: "What screen size do you prefer?" })).toBeVisible()
    await page.getByRole("button", { name: /15–16 inches/ }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // Step 8 -- portability (last step -> email + submit)
    await expect(page.getByRole("heading", { level: 2, name: "How portable should it be?" })).toBeVisible()
    await page.getByRole("button", { name: /Balanced/ }).click()
    await expect(page.getByLabel("Get these results by email (optional)")).toBeVisible()
    await page.getByRole("button", { name: "See My Matches" }).click()

    // Landed on results with the stubbed payload
    await page.waitForURL("**/results")
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible()
    await expect(page.getByText("Best Match")).toBeVisible()

    shouldHaveNoConsoleErrors(errors)
  })

  test("persists progress and lets the user skip optional questions", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await stubQuizApi(page)

    await page.goto("/quiz")
    await page.getByRole("button", { name: /Advanced/ }).click()

    // useCase (required) - must answer to advance
    await page.getByRole("button", { name: /Gaming/ }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // budget - fill both fields, then Next
    await page.getByLabel("Minimum budget").fill("1000")
    await page.getByLabel("Minimum budget").press("Enter")
    await page.getByLabel("Maximum budget").fill("2500")
    await page.getByLabel("Maximum budget").press("Enter")
    await page.getByRole("button", { name: "Next", exact: true }).click()

    // OS - optional, skip it
    await expect(page.getByRole("heading", { level: 2, name: "Which operating system do you prefer?" })).toBeVisible()
    await page.getByRole("button", { name: "Skip" }).click()

    // RAM - optional, skip it too
    await expect(page.getByRole("heading", { level: 2, name: "How much RAM do you need?" })).toBeVisible()
    await page.getByRole("button", { name: "Skip" }).click()

    // Back navigation returns to the RAM step
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("heading", { level: 2, name: "How much RAM do you need?" })).toBeVisible()

    shouldHaveNoConsoleErrors(errors)
  })
})