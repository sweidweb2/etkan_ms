import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

const STUDENT_SMOKE_ROUTES: ReadonlyArray<{
  path: string;
  landmark: string;
  expectUrl?: RegExp;
}> = [
  { path: "/student", landmark: "My profile" },
  { path: "/student/classes", landmark: "My classes" },
  { path: "/student/payments", landmark: "My payments" },
];

test.describe("student smoke nav @smoke", () => {
  test.use({ storageState: storageStatePath("student") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("student"),
      "student storageState missing — run npm run seed:demo"
    );
  });

  for (const route of STUDENT_SMOKE_ROUTES) {
    test(`${route.path} loads`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "commit" });
      await expect(page).toHaveURL(
        route.expectUrl ?? new RegExp(escapeRegExp(route.path)),
        { timeout: 15_000 }
      );
      await assertNoErrorOverlay(page);
      await expect(page.getByText(route.landmark).first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        page.getByRole("button", { name: "Account menu" })
      ).toBeVisible();
    });
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
