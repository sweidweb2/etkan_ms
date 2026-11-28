import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

/**
 * Semester teams kanban board — smoke landmarks + create-team dialog open/cancel.
 */
test.describe("manager semesters board @smoke", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("board loads with teams and create-team dialog", async ({ page }) => {
    await page.goto("/manager/semesters", { waitUntil: "commit" });
    await assertNoErrorOverlay(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage semesters" })
    ).toBeVisible({ timeout: 15_000 });
    const createTeam = page.getByRole("button", { name: "Create team" }).first();
    await expect(createTeam).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add semester" })
    ).toBeVisible();
    await expect(page.getByText("Unassigned").first()).toBeVisible({
      timeout: 15_000,
    });

    // Seeded demo (skip soft if missing).
    const demoTeam = page.getByText("Demo Cohort A");
    const demoSemester = page.getByText(/Demo Fall 2026|Demo Spring 2027/);
    if ((await demoTeam.count()) > 0) {
      await expect(demoTeam.first()).toBeVisible();
    }
    if ((await demoSemester.count()) > 0) {
      await expect(demoSemester.first()).toBeVisible();
    }

    await createTeam.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Create team" })
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  });
});

