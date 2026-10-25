import { expect, test } from "@playwright/test";

test.describe("public auth pages @smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });

  test("signup is disabled (redirects away)", async ({ page }) => {
    // PUBLIC_SIGNUP_ENABLED is false in lib/constants/auth.ts
    await page.goto("/auth/signup", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 45_000 });
  });
});
