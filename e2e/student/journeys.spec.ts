import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

const DEMO_CLASS = "Demo Math 101";

test.describe("student panel journeys @smoke", () => {
  test.use({ storageState: storageStatePath("student") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("student"),
      "student storageState missing — run npm run seed:demo"
    );
  });

  test("open enrolled demo class from My classes", async ({ page }) => {
    await page.goto("/student/classes", { waitUntil: "commit" });
    await assertNoErrorOverlay(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "My classes" })
    ).toBeVisible({ timeout: 15_000 });

    const card = page.getByRole("link").filter({ hasText: DEMO_CLASS }).first();
    if ((await card.count()) === 0) {
      // May be a button/card without link role.
      const byText = page.getByText(DEMO_CLASS).first();
      if ((await byText.count()) === 0) {
        test.skip(true, "Demo Math 101 not enrolled for demo student");
      }
      await byText.click();
    } else {
      await card.click();
    }

    await expect(page).toHaveURL(/\/student\/classes\/[^/]+/, {
      timeout: 15_000,
    });
    await assertNoErrorOverlay(page);
    await expect(page.getByText(DEMO_CLASS).first()).toBeVisible();
  });

  test("payments list loads", async ({ page }) => {
    await page.goto("/student/payments", { waitUntil: "commit" });
    await assertNoErrorOverlay(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "My payments" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Open payment phases|No open payment/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
