import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { e2eStamp } from "../helpers/unique";

test.describe("manager equipment @mutation", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("create equipment, open detail, borrow page smoke", async ({ page }) => {
    const stamp = e2eStamp("eq");
    const name = `E2E Eq ${stamp}`.slice(0, 40);

    await page.goto("/manager/equipments");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage equipment" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add equipment" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add equipment" })
    ).toBeVisible();
    await dialog.locator("#add-equipment-name").fill(name);
    await dialog.locator("#add-equipment-quantity").fill("5");
    await dialog.locator("#add-equipment-unit-price").fill("10");
    await dialog.getByRole("button", { name: "Create equipment" }).click();

    await expectToastVisible(page, "Equipment created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    const view = page.getByRole("button", { name: `View ${name}` });
    await expect(view).toBeVisible({ timeout: 20_000 });
    const href = await view.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page).toHaveURL(/\/manager\/equipments\/[^/]+/);
    await expect(page.getByText(name).first()).toBeVisible();

    await page.goto("/manager/equipments/borrow");
    await expect(
      page.getByRole("heading", { level: 1, name: "Borrow equipment" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save borrow" })).toBeVisible();
  });

  test("borrow and return when inventory allows", async ({ page }) => {
    await page.goto("/manager/equipments/borrow");
    await expect(
      page.getByRole("heading", { level: 1, name: "Borrow equipment" })
    ).toBeVisible();

    const studentToggle = page.locator('[aria-pressed="false"]').first();
    if ((await studentToggle.count()) === 0) {
      test.skip(true, "No selectable students on borrow page");
    }
    await studentToggle.click();

    await page.getByRole("button", { name: "Continue to equipment" }).click();

    const equipmentToggle = page.locator('[aria-pressed="false"]').first();
    if ((await equipmentToggle.count()) === 0) {
      test.skip(true, "No selectable equipment on borrow page");
    }
    await equipmentToggle.click();

    await page.getByRole("button", { name: "Save borrow" }).click();
    await expectToastVisible(page, /borrow record(s)? saved\./i);

    const markReturned = page
      .getByRole("switch", { name: "Mark as returned" })
      .first();
    if ((await markReturned.count()) > 0) {
      await markReturned.click();
      await expectToastVisible(page, "Equipment marked as returned.");
    }
  });
});
