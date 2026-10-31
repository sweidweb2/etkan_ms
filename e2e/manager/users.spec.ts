import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { e2eStamp } from "../helpers/unique";

test.describe("manager users @mutation", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("create staff user then edit username", async ({ page }) => {
    const stamp = e2eStamp("usr");
    const username = stamp.slice(0, 28);
    const email = `${username}@example.com`;
    const editedUsername = `${username}_e`.slice(0, 30);

    await page.goto("/manager/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage users" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add user" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add user" })).toBeVisible();

    await dialog.locator("#add-user-username").fill(username);
    await dialog.locator("#add-user-email").fill(email);
    // Role defaults to Teacher — leave as-is.
    await dialog.getByRole("button", { name: "Create user" }).click();

    await expectToastVisible(page, "Staff account created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(email).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: `Edit ${username}` }).click();
    const editDialog = page.getByRole("dialog");
    await expect(
      editDialog.getByRole("heading", { name: "Edit user" })
    ).toBeVisible();

    await editDialog.locator("#edit-user-username").fill(editedUsername);
    await editDialog.getByRole("button", { name: "Save changes" }).click();

    await expectToastVisible(page, "User updated.");
    await expect(editDialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(editedUsername).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
