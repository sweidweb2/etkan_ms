import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { e2eStamp } from "../helpers/unique";

/** Phase 9 — notifications create + mark read. */
test.describe("manager notifications @mutation", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("create notification and mark as read", async ({ page }) => {
    const stamp = e2eStamp("ntf");
    const title = `E2E Note ${stamp}`.slice(0, 80);

    await page.goto("/manager/notifications", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" })
    ).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "Create notification" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Create notification" })
    ).toBeVisible();

    await dialog.locator("#create-notification-title").fill(title);
    await dialog
      .locator("#create-notification-body")
      .fill("E2E notification body.");
    await dialog.getByRole("button", { name: "Create notification" }).click();

    await expectToastVisible(page, "Notification created.");
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });

    // Cards are role=button; prefer exact name so we don't click the card itself.
    const card = page.locator("article").filter({ hasText: title });
    const markRead = card.getByRole("button", {
      name: "Mark as read",
      exact: true,
    });
    if ((await markRead.count()) > 0) {
      await markRead.click();
      await expectToastVisible(
        page,
        /Notification marked as read\.|Notification already marked as read\./
      );
      await expect(card.getByText(/^Read /)).toBeVisible({ timeout: 15_000 });
    }
  });
});
