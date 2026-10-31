import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { selectOptionByTriggerId } from "../helpers/select-option";
import { e2eStamp } from "../helpers/unique";

/** Phase 9 — gallery / projects / blogs create samples. */
test.describe("manager content @mutation", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("gallery list loads @smoke", async ({ page }) => {
    await page.goto("/manager/gallery", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage gallery" })
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: "Add image" })).toBeVisible();
  });

  test("create project", async ({ page }) => {
    const stamp = e2eStamp("proj");
    const title = `E2E Project ${stamp}`.slice(0, 80);

    await page.goto("/manager/projects", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage projects" })
    ).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "Create" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add project" })
    ).toBeVisible();

    await selectOptionByTriggerId(page, "add-project-classification", "Etkan");
    await dialog.locator("#add-project-category").fill("E2E");
    await dialog.locator("#add-project-title").fill(title);
    await dialog.locator("#add-project-author").fill("E2E Author");
    await dialog.locator("#add-project-body").fill("E2E project body for tests.");
    await dialog.getByRole("button", { name: "Add project" }).click();

    await expectToastVisible(page, "Project created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });

  test("create blog draft", async ({ page }) => {
    const stamp = e2eStamp("blog");
    const title = `E2E Blog ${stamp}`.slice(0, 80);
    const slug = `e2e-blog-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    await page.goto("/manager/blogs", { waitUntil: "commit" });
    await expect(page.getByText("Blogs").first()).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: "New blog" }).click();
    const sheet = page.getByRole("dialog");
    await expect(
      sheet.getByRole("heading", { name: "New blog" })
    ).toBeVisible();

    await sheet.locator("#add-blog-title").fill(title);
    await sheet.locator("#add-blog-slug").fill(slug);
    await sheet.locator("#add-blog-summary").fill("E2E summary");
    const body = sheet.locator("[contenteditable='true']").first();
    await body.click();
    await page.keyboard.type("E2E blog body content.");
    await sheet.locator("#add-blog-author").fill("E2E Author");
    await sheet.getByRole("button", { name: "Create blog" }).click();

    await expectToastVisible(page, "Blog created.");
    await expect(sheet).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });
});
