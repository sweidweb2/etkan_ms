import { expect, test } from "@playwright/test";
import { getCredentials } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";

test.describe("auth login invalid", () => {
  test("bad password shows error and stays on login", async ({ page }) => {
    const { email } = getCredentials("manager");

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("DefinitelyWrongPass1!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expectToastVisible(page, /Invalid email or password/i);
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

