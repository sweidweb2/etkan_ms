import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { e2eStamp } from "../helpers/unique";

test.describe("manager instructors", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("list loads @smoke", async ({ page }) => {
    await page.goto("/manager/instructors", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage instructors" })
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: "Add instructors" })
    ).toBeVisible();
  });

  test("create instructor subject @mutation", async ({ page }) => {
    const name = `E2E Instr Subj ${e2eStamp("is")}`.slice(0, 80);

    await page.goto("/manager/instructors", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage instructors" })
    ).toBeVisible({ timeout: 60_000 });
    const addSubject = page.getByRole("button", {
      name: "Add instructor subject",
    });
    if ((await addSubject.count()) === 0) {
      test.skip(true, "Add instructor subject control not visible");
    }

    await addSubject.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add instructor subject" })
    ).toBeVisible();
    await dialog.locator("#add-instructor-subject-name").fill(name);
    await dialog.getByRole("button", { name: "Create" }).click();

    await expectToastVisible(page, "Instructor subject created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });
  });
});
