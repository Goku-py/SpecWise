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

  test("Budget step keeps label → field → control hierarchy", async ({ page }) => {
    await page.goto("/quiz");
    await page.getByRole("button", { name: /Study, work/ }).click();
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "What's your budget?" })).toBeVisible();
    const layout = await page.evaluate(() => {
      const legend = [...document.querySelectorAll("legend")].find((el) =>
        /budget/i.test(el.textContent ?? "")
      );
      const minLabel = document.querySelector('input[aria-label="Minimum budget"]')?.closest("label");
      const minInput = document.querySelector('input[aria-label="Minimum budget"]');
      const maxInput = document.querySelector('input[aria-label="Maximum budget"]');
      const noMax = document.querySelector('input[type="checkbox"]')?.closest("label");
      if (!legend || !minLabel || !minInput || !maxInput || !noMax) return null;
      const l = legend.getBoundingClientRect();
      const ml = minLabel.getBoundingClientRect();
      const mi = minInput.getBoundingClientRect();
      const xi = maxInput.getBoundingClientRect();
      const nm = noMax.getBoundingClientRect();
      return {
        legendToLabel: ml.top - l.bottom,
        inputTopsEqual: Math.abs(mi.top - xi.top) <= 1,
        noMaxOverlapsInputs: nm.top < mi.bottom && nm.bottom > mi.top,
      };
    });
    expect(layout).not.toBeNull();
    // Section label sits clearly above the field row (never touching/overlapping).
    expect(layout!.legendToLabel).toBeGreaterThanOrEqual(12);
    // Min/Max inputs share a baseline; "No maximum" rides the same row.
    expect(layout!.inputTopsEqual).toBe(true);
    expect(layout!.noMaxOverlapsInputs).toBe(true);
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
