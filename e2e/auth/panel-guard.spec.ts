import { expect, test } from "@playwright/test";
import {
  hasStorageState,
  ROLE_HOME,
  storageStatePath,
} from "../fixtures/auth";

test.describe("auth panel guard @smoke", () => {
  test("unauthenticated /manager/students redirects to login", async ({
    page,
  }) => {
    await page.goto("/manager/students");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("signed-in manager visiting login is redirected to panel", async ({
    browser,
  }) => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );

    const context = await browser.newContext({
      storageState: storageStatePath("manager"),
    });
    const page = await context.newPage();
    await page.goto("/auth/login");
    await expect(page).toHaveURL(new RegExp(ROLE_HOME.manager));
    await context.close();
  });

  test("manager can open panel with storageState", async ({ browser }) => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );

    const context = await browser.newContext({
      storageState: storageStatePath("manager"),
    });
    const page = await context.newPage();
    await page.goto(ROLE_HOME.manager);
    await expect(page).toHaveURL(new RegExp(ROLE_HOME.manager));
    await expect(
      page.getByRole("button", { name: "Account menu" })
    ).toBeVisible();
    await context.close();
  });
});
