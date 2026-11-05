import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { e2eStamp } from "../helpers/unique";

test.describe("manager guests", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("list loads @smoke", async ({ page }) => {
    await page.goto("/manager/guests");
    await expect(
      page.getByRole("heading", { level: 1, name: "Guests" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create guest" })
    ).toBeVisible();
  });

  test("create guest then open detail @mutation", async ({ page }) => {
    const stamp = e2eStamp("gst");
    const fullName = `E2E Guest ${stamp.slice(-8)}`;

    await page.goto("/manager/guests");
    await page.getByRole("button", { name: "Create guest" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Create guest" })
    ).toBeVisible();

    await dialog.locator("#add-guest-full-name").fill(fullName);
    await dialog.getByRole("button", { name: "Create guest" }).click();

    await expectToastVisible(page, "Guest created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(fullName).first()).toBeVisible({
      timeout: 20_000,
    });

    await page
      .getByRole("link", { name: `View details for ${fullName}` })
      .click();
    await expect(page).toHaveURL(/\/manager\/guests\/[^/]+/);
    await expect(page.getByText(fullName).first()).toBeVisible();
  });
});
