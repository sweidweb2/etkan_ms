import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

const DEMO_STUDENT = "Alice Anderson";

/**
 * Drop-student console journey — load, search, inspect actions; no destructive submit.
 */
test.describe("manager drop student @smoke", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("search student loads console then change student", async ({ page }) => {
    await page.goto("/manager/students/drop", { waitUntil: "commit" });
    await assertNoErrorOverlay(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Drop student", exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Beta — Drop student console")).toBeVisible();
    await expect(page.getByText("Select a student")).toBeVisible();

    const search = page.locator("#drop-student-search");
    await search.click();
    await search.fill("Alice");
    const suggestion = page
      .locator("button")
      .filter({ hasText: DEMO_STUDENT })
      .first();
    await expect(suggestion).toBeVisible({ timeout: 20_000 });
    await suggestion.click();

    await expect(
      page.getByRole("button", { name: "Change student" })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Classes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Action" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Billing & payment history" })
    ).toBeVisible();

    // Open action menu — assert options exist; do not Continue (destructive).
    if (
      await page
        .getByText("No actions available for your permissions on this student.")
        .isVisible()
        .catch(() => false)
    ) {
      // Permissions-only env — still covered search/console load above.
    } else {
      await page.getByText("Select an action…").click();
      await expect(
        page
          .getByRole("option")
          .filter({ hasText: /Drop|Remove from class|Inactivate|refund/i })
          .first()
      ).toBeVisible({ timeout: 10_000 });
      await page.keyboard.press("Escape");
    }

    await page.getByRole("button", { name: "Change student" }).click();
    await expect(page.getByText("Select a student")).toBeVisible();
  });
});
