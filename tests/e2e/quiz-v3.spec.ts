import { test, expect, type Page } from "@playwright/test";
import { collectConsoleErrors, shouldHaveNoConsoleErrors } from "./helpers";

/**
 * v3 cutover: Quick → CanonicalProfile → POST /api/quiz v3 → /results (DTO).
 * Advanced refines the same profile. Legacy SpecQuiz is no longer routed.
 */

async function goToMustHaves(page: Page) {
  await page.goto("/quiz");
  await page.getByRole("button", { name: /Study \/ office/ }).click();
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Any must-haves?" })
  ).toBeVisible();
}

test.describe("quiz v3 cutover", () => {
  test("Test 1 — Quick → Results renders the v3 DTO", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/quiz");
    await expect(
      page.getByRole("heading", { level: 2, name: "What will you mainly use this laptop for?" })
    ).toBeVisible();
    await page.getByRole("button", { name: /Study \/ office/ }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "What's your budget?" })).toBeVisible();
    await page.getByLabel("Maximum budget").fill("2500");
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "What matters most?" })).toBeVisible();
    await page.getByRole("button", { name: /Battery life/ }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Any must-haves?" })).toBeVisible();
    await page.getByRole("button", { name: "SEE MATCHES", exact: true }).click();
    await expect(page).toHaveURL(/\/results/);
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible();
    await expect(page.getByTestId("top-specs")).toBeVisible();
    shouldHaveNoConsoleErrors(errors);
  });

  test("Test 2 — Quick → Advanced → Results reflects the refinement", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goToMustHaves(page);
    await page.getByRole("button", { name: "Advanced refine", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Advanced refinement" })
    ).toBeVisible();
    // Study-office sections: battery hours chip
    await page.getByRole("button", { name: "10h", exact: true }).click();
    await page.getByRole("button", { name: "SEE MATCHES", exact: true }).click();
    await expect(page).toHaveURL(/\/results/);
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible();
    shouldHaveNoConsoleErrors(errors);
  });

  test("Test 3 — Quick answers preserved through Advanced and back", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/quiz");
    await page.getByRole("button", { name: /Gaming/ }).click();
    await page.getByRole("button", { name: "Story-driven AAA", exact: true }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await page.getByRole("button", { name: "Advanced refine", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Advanced refinement" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "What will you mainly use this laptop for?" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Gaming/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Story-driven AAA", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    shouldHaveNoConsoleErrors(errors);
  });

  test("Test 4 — Must hard-filters (OS must be macos)", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goToMustHaves(page);
    await page.getByRole("button", { name: "macos", exact: true }).click();
    await page.getByRole("button", { name: "Only show macos", exact: true }).click();
    await page.getByRole("button", { name: "SEE MATCHES", exact: true }).click();
    await expect(page).toHaveURL(/\/results/);
    const specs = page.getByTestId("item-specs");
    await expect(specs.first()).toBeVisible();
    for (const text of await specs.allTextContents()) {
      expect(text.toLowerCase()).toContain("macos");
    }
    shouldHaveNoConsoleErrors(errors);
  });

  test("Test 5 — Prefer keeps candidates eligible with missed-target notes", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goToMustHaves(page);
    await page.getByRole("button", { name: "64 GB", exact: true }).click();
    await page.getByRole("button", { name: "SEE MATCHES", exact: true }).click();
    await expect(page).toHaveURL(/\/results/);
    await expect(page.getByRole("heading", { level: 1, name: "Your Matches" })).toBeVisible();
    // 64GB-preferred: catalog mostly below → missed-preferred notes appear
    await expect(page.getByText("Missed preferred targets").first()).toBeVisible();
    shouldHaveNoConsoleErrors(errors);
  });

  test("Test 6 — Relaxation ledger renders on impossible budget", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/quiz");
    await page.getByRole("button", { name: /Study \/ office/ }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await page.getByLabel("Maximum budget").fill("1");
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await page.getByRole("button", { name: "SEE MATCHES", exact: true }).click();
    await expect(page).toHaveURL(/\/results/);
    await expect(page.getByText("No exact matches.").first()).toBeVisible();
    shouldHaveNoConsoleErrors(errors);
  });

  test("Test 7 — Intent-hard contradiction reaches explicit revision state", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await goToMustHaves(page);
    await page.getByRole("button", { name: "linux", exact: true }).click();
    await page.getByRole("button", { name: "Only show linux", exact: true }).click();
    await page.getByRole("button", { name: "SEE MATCHES", exact: true }).click();
    await expect(page).toHaveURL(/\/results/);
    await expect(
      page.getByText("never relaxes those automatically").first()
    ).toBeVisible();
    shouldHaveNoConsoleErrors(errors);
  });
});
