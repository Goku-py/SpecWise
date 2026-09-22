import { test, expect, type Page } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors } from "./helpers"
import { SEEDED_RESULTS } from "./fixtures/results"

/**
 * End-to-end coverage of the quiz -> results funnel (server-rendered shell +
 * lazy-loaded client QuizFlow). /quiz now opens on a gate screen ("Let's find
 * your laptop") where the user picks the quick (3-step) or advanced (4-step)
 * path; the choice is persisted in localStorage (specwise-quiz-mode) and Back
 * on step 1 returns to the gate. The POST /api/quiz call is stubbed so the
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

  test("quick path runs the full quiz and lands on results", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await stubQuizApi(page)

    await page.goto("/quiz")

    // Gate screen -- pick the quick path
    await expect(page.getByRole("heading", { level: 1, name: "Let's find your laptop" })).toBeVisible()
    await page.getByRole("button", { name: /Quick & Simple/ }).click()

    // Step 1 -- workload (quick path)
    await expect(page.getByRole("heading", { level: 2, name: "What is your primary workload?" })).toBeVisible()
    await page.getByRole("button", { name: /Software Dev & LLMs/ }).click()

    // Step 2 -- budget (quick path)
    await expect(page.getByRole("heading", { level: 2, name: "Set your budget" })).toBeVisible()
    await page.getByLabel("Minimum budget").fill("800")
    await page.getByLabel("Minimum budget").press("Enter")
    await page.getByLabel("Maximum budget").fill("2000")
    await page.getByLabel("Maximum budget").press("Enter")
    await page.getByRole("button", { name: "NEXT", exact: true }).click()

    // Step 3 -- review (no NEXT button here, submit directly)
    await expect(page.getByRole("heading", { level: 2, name: "Review your profile" })).toBeVisible()
    await expect(page.getByLabel("Get these results by email")).toBeVisible()
    await page.getByRole("button", { name: "SEE MY MATCHES" }).click()

    // Landed on results with the stubbed payload
    await page.waitForURL("**/results")
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible()
    await expect(page.getByText("Best Match")).toBeVisible()

    shouldHaveNoConsoleErrors(errors)
  })

  test("advanced path runs the full quiz and lands on results", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await stubQuizApi(page)

    await page.goto("/quiz")

    // Gate screen -- pick the advanced path
    await expect(page.getByRole("heading", { level: 1, name: "Let's find your laptop" })).toBeVisible()
    await page.getByRole("button", { name: /Advanced/ }).click()

    // Step 1 -- workload (required, starts immediately)
    await expect(page.getByRole("heading", { name: "What is your primary workload?" })).toBeVisible()
    await page.getByRole("button", { name: /Software Dev & LLMs/ }).click()

    // Step 2 -- constraints (budget, weight, OS, RAM, storage, display size)
    await expect(page.getByRole("heading", { name: "Set your constraints" })).toBeVisible()
    const minBudget = page.getByLabel("Minimum budget")
    const maxBudget = page.getByLabel("Maximum budget")
    await minBudget.fill("800")
    await minBudget.press("Enter")
    await maxBudget.fill("2000")
    await maxBudget.press("Enter")
    await page.getByRole("button", { name: "NEXT", exact: true }).click()

    // Step 3 -- requirements (GPU, battery, upgradeability, ports, display, security)
    await expect(page.getByRole("heading", { name: "Refine your requirements" })).toBeVisible()
    await page.getByRole("button", { name: "NEXT", exact: true }).click()

    // Step 4 -- results (profile summary + email + submit)
    await expect(page.getByRole("heading", { name: "Review your profile" })).toBeVisible()
    await expect(page.getByLabel("Get these results by email")).toBeVisible()
    await page.getByRole("button", { name: "SEE MY MATCHES" }).click()

    // Landed on results with the stubbed payload
    await page.waitForURL("**/results")
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible()
    await expect(page.getByText("Best Match")).toBeVisible()

    shouldHaveNoConsoleErrors(errors)
  })

  test("persists progress, navigates back, and returns to the gate", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await stubQuizApi(page)

    await page.goto("/quiz")

    // Gate screen -- pick the advanced path
    await expect(page.getByRole("heading", { level: 1, name: "Let's find your laptop" })).toBeVisible()
    await page.getByRole("button", { name: /Advanced/ }).click()

    // Step 1 -- select a workload preset
    await expect(page.getByRole("heading", { name: "What is your primary workload?" })).toBeVisible()
    await page.getByRole("button", { name: /Competitive Gaming/ }).click()

    // Step 2 -- constraints
    await expect(page.getByRole("heading", { name: "Set your constraints" })).toBeVisible()
    await page.getByLabel("Minimum budget").fill("1000")
    await page.getByLabel("Minimum budget").press("Enter")
    await page.getByLabel("Maximum budget").fill("2500")
    await page.getByLabel("Maximum budget").press("Enter")
    await page.getByRole("button", { name: "NEXT", exact: true }).click()

    // Step 3 -- requirements
    await expect(page.getByRole("heading", { name: "Refine your requirements" })).toBeVisible()

    // Back navigation returns to the constraints step
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("heading", { name: "Set your constraints" })).toBeVisible()

    // Back again to the workload step
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("heading", { name: "What is your primary workload?" })).toBeVisible()

    // Back on step 1 returns to the gate screen
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Let's find your laptop" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Quick & Simple/ })).toBeVisible()

    // Re-selecting a mode restarts the quiz at step 1
    await page.getByRole("button", { name: /Advanced/ }).click()
    await expect(page.getByRole("heading", { name: "What is your primary workload?" })).toBeVisible()

    shouldHaveNoConsoleErrors(errors)
  })

  test("reloads mid-quiz and restores the saved step", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await stubQuizApi(page)

    // Seed a mid-quiz state BEFORE load so the mount effect must restore it
    // (mirrors the seedResults addInitScript pattern in helpers.ts)
    page.addInitScript(
      ({ mode, step, answersJson }) => {
        localStorage.setItem("specwise-quiz-mode", mode)
        localStorage.setItem("specwise-quiz-step", step)
        localStorage.setItem("specwise-quiz-answers", answersJson)
      },
      {
        mode: "advanced",
        step: "2",
        answersJson: JSON.stringify({ useCase: "gaming" }),
      }
    )

    await page.goto("/quiz")

    // Advanced step index 2 = requirements — restored mid-quiz, NOT the gate
    await expect(page.getByRole("heading", { name: "Refine your requirements" })).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 1, name: "Let's find your laptop" })
    ).toHaveCount(0)

    // Critical: seeding storage pre-load must not produce hydration errors
    shouldHaveNoConsoleErrors(errors)
  })

  test("survives corrupt storage and falls back to the gate", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await stubQuizApi(page)

    // Seed corrupt values: invalid mode, non-numeric step, broken answers JSON
    page.addInitScript(
      ({ mode, step, answersJson }) => {
        localStorage.setItem("specwise-quiz-mode", mode)
        localStorage.setItem("specwise-quiz-step", step)
        localStorage.setItem("specwise-quiz-answers", answersJson)
      },
      {
        mode: "xyz",
        step: "not-a-number",
        answersJson: "{broken json",
      }
    )

    await page.goto("/quiz")

    // Corrupt storage must not crash or stick — falls back to the gate
    await expect(page.getByRole("heading", { level: 1, name: "Let's find your laptop" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Quick & Simple/ })).toBeVisible()

    // Flow stays usable after the corrupt restore
    await page.getByRole("button", { name: /Quick & Simple/ }).click()
    await expect(page.getByRole("heading", { level: 2, name: "What is your primary workload?" })).toBeVisible()

    shouldHaveNoConsoleErrors(errors)
  })
})