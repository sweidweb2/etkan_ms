import { expect, test } from "@playwright/test";

test.describe("public home @smoke", () => {
  test("loads brand and hero content", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Etkan/i);
    await expect(page.getByText("Etkan", { exact: true }).first()).toBeVisible();
  });
});
