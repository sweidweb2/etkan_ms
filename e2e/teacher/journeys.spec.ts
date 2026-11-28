import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

const DEMO_CLASS = "Demo Math 101";

test.describe("teacher panel journeys @smoke", () => {
  test.use({ storageState: storageStatePath("teacher") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("teacher"),
      "teacher storageState missing — run npm run seed:demo"
    );
  });

  test("open demo class detail from My classes", async ({ page }) => {
    await page.goto("/teacher/classes", { waitUntil: "commit" });
    await assertNoErrorOverlay(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "My classes" })
    ).toBeVisible({ timeout: 15_000 });

    const search = page.getByLabel("Search classes");
    if ((await search.count()) > 0) {
      await search.fill("Math");
    }

    const card = page.getByRole("link").filter({ hasText: DEMO_CLASS }).first();
    if ((await card.count()) === 0) {
      test.skip(true, "Demo Math 101 not assigned to demo teacher");
    }
    await card.click();
    await expect(page).toHaveURL(/\/teacher\/classes\/[^/]+/, {
      timeout: 15_000,
    });
    await assertNoErrorOverlay(page);
    await expect(page.getByText(DEMO_CLASS).first()).toBeVisible();
    await expect(page.getByText("My classes").first()).toBeVisible();
  });
});
