import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";

test.describe("manager registrations @smoke", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("list loads and opens first detail when a row exists", async ({
    page,
  }) => {
    await page.goto("/manager/registrations");
    await expect(
      page.getByRole("heading", { level: 1, name: "Registrations" })
    ).toBeVisible();

    const viewLink = page.getByRole("link", { name: /^View / }).first();
    if ((await viewLink.count()) === 0) {
      test.skip(true, "No registration rows seeded in this env");
    }

    await viewLink.click();
    await expect(page).toHaveURL(/\/manager\/registrations\/[^/]+/);
    await expect(
      page.getByRole("heading", { level: 1 }).first()
    ).toBeVisible();
    await expect(page.getByText("Status & notes").first()).toBeVisible();
  });
});
