import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";

test.describe("manager instructors", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("list loads @smoke", async ({ page }) => {
    await page.goto("/manager/instructors", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage instructors" })
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: "Add instructors" })
    ).toBeVisible();
  });

  test("uses academic subjects for capabilities", async ({ page }) => {
    await page.goto("/manager/instructors", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 2, name: "Subject capabilities" })
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: "Add instructor subject" })
    ).toHaveCount(0);
  });
});
