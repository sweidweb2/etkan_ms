import { expect, test } from "@playwright/test";
import { logoutViaUi, storageStatePath } from "../fixtures/auth";

test.describe("auth logout", () => {
  test.use({ storageState: storageStatePath("manager") });

  test("manager can log out to login page", async ({ page }) => {
    await page.goto("/manager/students");
    await expect(page).toHaveURL(/\/manager\/students/);
    await logoutViaUi(page);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
