import { expect, test } from "@playwright/test";

test.describe("public maintenance @smoke", () => {
  test("maintenance page renders without enabling site-wide maintenance", async ({
    page,
  }) => {
    await page.goto("/maintenance");
    await expect(
      page.getByRole("heading", { name: /Maintenance mode/i })
    ).toBeVisible();
  });
});
