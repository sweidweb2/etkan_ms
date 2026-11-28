import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

const DEMO_CLASS = "Demo Math 101";

/**
 * Grade certificates — assert lock gate on in-progress demo class;
 * export controls only when a Done class is present.
 */
test.describe("manager certificates @smoke", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  test("demo class grades stay locked while not Done", async ({ page }) => {
    await page.goto("/manager/classes", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage classes" })
    ).toBeVisible({ timeout: 15_000 });

    const statusFilter = page.getByLabel("Filter classes by status");
    if ((await statusFilter.count()) > 0) {
      await statusFilter.click();
      const inProgress = page.getByRole("option", { name: /In progress/i });
      if ((await inProgress.count()) > 0) {
        await inProgress.click();
      } else {
        await page.keyboard.press("Escape");
      }
    }

    const view = page.getByRole("button", { name: `View ${DEMO_CLASS}` }).first();
    if ((await view.count()) === 0) {
      test.skip(true, "Demo Math 101 not seeded — run npm run seed:demo");
    }
    const href = await view.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(`${href!.replace(/\/$/, "")}/grades`, {
      waitUntil: "commit",
    });
    await assertNoErrorOverlay(page);
    await expect(page).toHaveURL(/\/grades$/);
    await expect(page.getByText("Grades locked").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/become available after the class is marked Done/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export all certificates" })
    ).toHaveCount(0);
  });

  test("Done class surfaces certificate export when present", async ({
    page,
  }) => {
    await page.goto("/manager/classes", { waitUntil: "commit" });
    const statusFilter = page.getByLabel("Filter classes by status");
    if ((await statusFilter.count()) === 0) {
      test.skip(true, "Status filter missing");
    }
    await statusFilter.click();
    const doneOption = page.getByRole("option", { name: /^Done/i });
    if ((await doneOption.count()) === 0) {
      test.skip(true, "No Done filter option");
    }
    await doneOption.click();

    const view = page.getByRole("button", { name: /^View / }).first();
    if ((await view.count()) === 0) {
      test.skip(true, "No Done classes in this env");
    }
    const href = await view.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(`${href!.replace(/\/$/, "")}/grades`, {
      waitUntil: "commit",
    });
    await assertNoErrorOverlay(page);

    if (await page.getByText("Grades locked").isVisible().catch(() => false)) {
      test.skip(true, "Selected class grades still locked");
    }

    await expect(
      page.getByText(/Students grades|Fast certificate|Students ready/i).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: "Export all certificates" })
    ).toBeVisible({ timeout: 15_000 });
  });
});
