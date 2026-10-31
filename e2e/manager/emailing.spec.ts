import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";

/**
 * Phase 9 — emailing / compose / sent.
 * Real send only when E2E_ALLOW_EMAIL=1.
 */
test.describe("manager emailing", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("emailing list and compose load @smoke", async ({ page }) => {
    await page.goto("/manager/emailing", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Emailing" })
    ).toBeVisible({ timeout: 45_000 });

    await page.goto("/manager/emailing/compose", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Compose letter" })
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("New message").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  });

  test("sent list and optional detail @smoke", async ({ page }) => {
    await page.goto("/manager/sent", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Sent emails" })
    ).toBeVisible({ timeout: 45_000 });

    const detailLink = page.locator('a[href*="/manager/sent/"]').first();
    if ((await detailLink.count()) === 0) {
      test.skip(true, "No sent emails in this env");
    }
    const href = await detailLink.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/manager\/sent\/[^/]+/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 45_000,
    });
  });

  test("compose send only when E2E_ALLOW_EMAIL=1 @mutation", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_ALLOW_EMAIL !== "1",
      "Set E2E_ALLOW_EMAIL=1 (Mailtrap) to exercise send"
    );

    await page.goto("/manager/emailing/compose", { waitUntil: "commit" });
    await page.locator("#compose-subject").fill("E2E compose smoke");
    // Minimal body if present.
    const body = page.locator("textarea, [contenteditable='true']").first();
    if ((await body.count()) > 0) {
      await body.fill("E2E body");
    }
    await page.getByRole("button", { name: "Send" }).click();
    await expectToastVisible(page, /Sent .+ email/i);
  });
});
