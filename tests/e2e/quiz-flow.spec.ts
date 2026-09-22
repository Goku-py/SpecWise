import { test, expect } from "@playwright/test"
import { collectConsoleErrors, shouldHaveNoConsoleErrors } from "./helpers"

/**
 * End-to-end coverage of the intent quiz funnel.
 *
 * /quiz renders SpecQuiz: a single-page, 3-step flow (Workload -> Budget & display
 * -> Fit & future-proofing) that re-ranks a local sample catalog live below the
 * form. There is no gate/mode picker and no navigation to /results — the old
 * "Let's find your laptop" gate and the QuizFlow component are no longer routed.
 * The share drawer (ExportBuildModal) exports the top build as Reddit markdown and
 * a pre-filled /quiz link.
 */

test.describe("quiz flow", () => {
  test("walks the three-step quiz and shows live matches", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/quiz")

    // Step 1 — workload
    await expect(
      page.getByRole("heading", { level: 2, name: "What will you primarily use it for?" })
    ).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Quiz progress" })).toContainText("1 / 3")
    await page.getByRole("button", { name: /Esports/ }).click()
    await expect(page.getByRole("button", { name: /Esports/ })).toHaveAttribute("aria-pressed", "true")

    // Step 2 — budget & display
    await page.getByRole("button", { name: "NEXT", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Budget & display" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Quiz progress" })).toContainText("2 / 3")
    await page.getByLabel("Maximum budget").fill("1500")
    await expect(page.getByLabel("Maximum budget")).toHaveValue("1500")

    // Step 3 — fit & future-proofing
    await page.getByRole("button", { name: "NEXT", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Fit & future-proofing" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Quiz progress" })).toContainText("3 / 3")
    await page.getByRole("button", { name: "Must have", exact: true }).click()
    await expect(page.getByRole("button", { name: "Must have", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    // Recommendations re-rank live on the same page — no navigation
    await expect(page.getByRole("heading", { level: 2, name: "Top matches" })).toBeVisible()
    expect(await page.locator("article").count()).toBeGreaterThan(0)
    expect(page.url()).toContain("/quiz")

    shouldHaveNoConsoleErrors(errors)
  })

  test("requires a workload before advancing", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/quiz")

    const next = page.getByRole("button", { name: "NEXT", exact: true })
    await expect(next).toBeDisabled()

    await page.getByRole("button", { name: /AAA 4K Gaming/ }).click()
    await expect(next).toBeEnabled()

    shouldHaveNoConsoleErrors(errors)
  })

  test("navigates back through the steps and restarts", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/quiz")

    await page.getByRole("button", { name: /Everyday Productivity/ }).click()
    await page.getByRole("button", { name: "NEXT", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Budget & display" })).toBeVisible()
    await page.getByRole("button", { name: "NEXT", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Fit & future-proofing" })).toBeVisible()

    // Back returns to the previous step
    await page.getByRole("button", { name: "Back", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Budget & display" })).toBeVisible()
    await page.getByRole("button", { name: "Back", exact: true }).click()
    await expect(
      page.getByRole("heading", { level: 2, name: "What will you primarily use it for?" })
    ).toBeVisible()

    // On step 1 the control becomes "Start over" and clears the selection
    await page.getByRole("button", { name: "Start over" }).click()
    await expect(page.getByRole("button", { name: /Everyday Productivity/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    )

    shouldHaveNoConsoleErrors(errors)
  })

  test("pre-fills answers from share-link query params", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto("/quiz?workload=esports&budget=1500&refresh=240%2B&portability=always&upgrade=must")

    await expect(page.getByRole("button", { name: /Esports/ })).toHaveAttribute("aria-pressed", "true")

    await page.getByRole("button", { name: "NEXT", exact: true }).click()
    await expect(page.getByLabel("Maximum budget")).toHaveValue("1500")
    await expect(page.getByRole("button", { name: "240+ Hz", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    await page.getByRole("button", { name: "NEXT", exact: true }).click()
    await expect(page.getByRole("button", { name: /Always on the go/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await expect(page.getByRole("button", { name: "Must have", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    )

    shouldHaveNoConsoleErrors(errors)
  })

  test("opens the share drawer with a Reddit markdown table and quiz link", async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(
      "/quiz?workload=esports&budget=1500&portability=sometimes&refresh=240%2B&upgrade=must&form=15-16"
    )

    await page.getByRole("button", { name: /Share build/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("heading", { name: "Reddit markdown", exact: true })
    ).toBeVisible()

    const markdown = dialog.locator("pre")
    await expect(markdown).toContainText("| Component | Spec |")
    await expect(markdown).toContainText("Match score")

    await expect(dialog.getByLabel("Shareable quiz link")).toHaveValue(/\/quiz\?workload=esports/)
    await expect(dialog.getByRole("button", { name: /Copy Reddit Markdown/ })).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()

    shouldHaveNoConsoleErrors(errors)
  })
})
