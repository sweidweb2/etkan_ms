import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { expectToastVisible } from "../helpers/expect-toast";
import { selectOptionByTriggerId } from "../helpers/select-option";
import { e2eStamp } from "../helpers/unique";

test.describe("manager instructor schedules @mutation", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("list and details load @smoke", async ({ page }) => {
    page.setDefaultNavigationTimeout(90_000);
    await page.goto("/manager/instructor-schedules", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Instructor schedules" })
    ).toBeVisible({ timeout: 60_000 });

    await page.goto("/manager/instructor-schedules/details", {
      waitUntil: "commit",
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Schedule slot details" })
    ).toBeVisible({ timeout: 60_000 });
  });

  test("create schedule slot", async ({ page }) => {
    const slotName = `E2E Slot ${e2eStamp("slot")}`.slice(0, 60);

    page.setDefaultNavigationTimeout(90_000);
    await page.goto("/manager/instructor-schedules", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Instructor schedules" })
    ).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Add slot" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add schedule slot" })
    ).toBeVisible();

    if (
      await dialog.getByText("No instructors available.").isVisible().catch(() => false)
    ) {
      test.skip(true, "No instructors available for schedule slots");
    }

    await page.locator("#add-schedule-slot-record-id").click();
    const instructorOption = page.getByRole("option").first();
    await expect(instructorOption).toBeVisible({ timeout: 15_000 });
    await instructorOption.click();

    await selectOptionByTriggerId(page, "add-schedule-slot-day", /Monday/);
    await dialog.locator("#add-instructor-schedule-slot-name").fill(slotName);
    await dialog.locator("#add-instructor-schedule-slot-start").fill("10:00");
    await dialog.locator("#add-instructor-schedule-slot-end").fill("11:00");
    await dialog.getByRole("button", { name: "Add slot" }).click();

    await expectToastVisible(page, /Schedule slot created\.|Slot created\./);
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(slotName).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
