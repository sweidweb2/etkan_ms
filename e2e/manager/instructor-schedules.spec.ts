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

  test("create schedule slot", async ({ page }) => {
    const stamp = e2eStamp("slot");
    const slotName = `E2E Slot ${stamp}`.slice(0, 60);
    // Unique hour avoids overlap collisions with prior E2E / demo slots.
    const hour = 8 + (Math.abs(hashCode(stamp)) % 10);
    const start = `${String(hour).padStart(2, "0")}:15`;
    const end = `${String(hour).padStart(2, "0")}:45`;

    await page.goto("/manager/instructor-schedules", { waitUntil: "commit" });
    await expect(
      page.getByRole("button", { name: "Add slot" })
    ).toBeVisible({ timeout: 30_000 });
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

    await selectOptionByTriggerId(page, "add-schedule-slot-day", /Wednesday/);
    await dialog.locator("#add-instructor-schedule-slot-name").fill(slotName);
    await dialog.locator("#add-instructor-schedule-slot-start").fill(start);
    await dialog.locator("#add-instructor-schedule-slot-end").fill(end);
    await dialog.getByRole("button", { name: "Add slot" }).click();

    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expectToastVisible(page, /Schedule slot created\.|Slot created\./);
    await expect(page.getByText(slotName).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

