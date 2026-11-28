import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

const TEACHER_SMOKE_ROUTES: ReadonlyArray<{
  path: string;
  landmark: string;
}> = [
  { path: "/teacher/classes", landmark: "My classes" },
  { path: "/teacher/settings", landmark: "Settings" },
];

test.describe("teacher smoke nav @smoke", () => {
  test.use({ storageState: storageStatePath("teacher") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("teacher"),
      "teacher storageState missing — run npm run seed:demo"
    );
  });

  for (const route of TEACHER_SMOKE_ROUTES) {
    test(`${route.path} loads`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "commit" });
      await expect(page).toHaveURL(new RegExp(escapeRegExp(route.path)), {
        timeout: 15_000,
      });
      await assertNoErrorOverlay(page);
      await expect(
        page.getByRole("heading", { level: 1, name: route.landmark })
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole("button", { name: "Account menu" })
      ).toBeVisible();
    });
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
