import { expect, test } from "@playwright/test";
import { loginAs, logoutViaUi } from "../fixtures/auth";

test.describe("auth logout", () => {
  test("manager can log out to login page", async ({ page }) => {
    await loginAs(page, "manager");
    await logoutViaUi(page);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

