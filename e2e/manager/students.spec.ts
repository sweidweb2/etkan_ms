import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { e2eStamp } from "../helpers/unique";

test.describe("manager students @mutation", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("create student then edit full name on detail", async ({ page }) => {
    const stamp = e2eStamp("stu");
    const username = stamp.slice(0, 28);
    const email = `${username}@example.com`;
    const fullName = `E2E Student ${stamp.slice(-6)}`;
    const editedName = `${fullName} Edit`;

    await page.goto("/manager/students");
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage students" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add student" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add student" })
    ).toBeVisible();

    await dialog.locator("#add-student-username").fill(username);
    await dialog.locator("#add-student-full-name").fill(fullName);
    await dialog.locator("#add-student-email").fill(email);
    await dialog.getByRole("button", { name: "Create student" }).click();

    await expectToastVisible(page, "Student account created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(fullName).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("link", { name: `View ${fullName}` }).click();

    await expect(page).toHaveURL(/\/manager\/students\/[^/]+/);
    await page.getByRole("button", { name: "Edit student" }).click();

    const editDialog = page.getByRole("dialog");
    await expect(
      editDialog.getByRole("heading", { name: "Edit student" })
    ).toBeVisible();
    await editDialog.locator("#edit-student-full-name").fill(editedName);
    await editDialog.getByRole("button", { name: "Save changes" }).click();

    await expectToastVisible(page, "Student details updated.");
    await expect(editDialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(editedName).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
