import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

/**
 * Phase 3 — every manager list/root route in plan §8.3 opens without crash.
 * Light assertions only (heading / landmark); no mutations.
 */
const MANAGER_SMOKE_ROUTES: ReadonlyArray<{
  path: string;
  /** Visible landmark after load. Prefer exact h1; fallbacks for odd pages. */
  landmark: RegExp | string;
  /** `/manager` redirects; assert final URL instead of path equality. */
  expectUrl?: RegExp;
}> = [
  {
    path: "/manager",
    landmark: "Manage students",
    expectUrl: /\/manager\/students/,
  },
  { path: "/manager/users", landmark: "Manage users" },
  { path: "/manager/students", landmark: "Manage students" },
  { path: "/manager/registrations", landmark: "Registrations" },
  { path: "/manager/guests", landmark: "Guests" },
  { path: "/manager/subjects", landmark: "Manage subjects" },
  { path: "/manager/subjects/catalog", landmark: "Categories & exercises" },
  { path: "/manager/classes", landmark: "Manage classes" },
  { path: "/manager/semesters", landmark: "Manage semesters" },
  { path: "/manager/instructors", landmark: "Manage instructors" },
  { path: "/manager/instructor-schedules", landmark: "Instructor schedules" },
  {
    path: "/manager/instructor-schedules/details",
    landmark: "Schedule slot details",
  },
  { path: "/manager/workshops", landmark: "Manage workshops" },
  { path: "/manager/workshops/payments", landmark: /Total payments/i },
  { path: "/manager/accounting", landmark: "Accounting" },
  { path: "/manager/income-statement", landmark: "Income statement" },
  {
    path: "/manager/income-statement/analytics",
    landmark: "Income statement analytics",
  },
  { path: "/manager/income-statement/history", landmark: "Past months" },
  { path: "/manager/academic-analysis", landmark: "Academic analysis" },
  { path: "/manager/emailing", landmark: "Emailing" },
  { path: "/manager/emailing/compose", landmark: "Compose letter" },
  { path: "/manager/sent", landmark: "Sent emails" },
  { path: "/manager/gallery", landmark: "Manage gallery" },
  { path: "/manager/projects", landmark: "Manage projects" },
  { path: "/manager/blogs", landmark: /Blogs/i },
  { path: "/manager/notifications", landmark: "Notifications" },
  { path: "/manager/pages", landmark: "Pages" },
  { path: "/manager/backup", landmark: "Backup" },
  { path: "/manager/logs", landmark: "Logs" },
  { path: "/manager/rbac", landmark: "Permissions" },
  { path: "/manager/settings", landmark: "Settings" },
  { path: "/manager/cron-jobs", landmark: "Cron jobs" },
];

test.describe("manager smoke nav @smoke", () => {
  test.use({ storageState: storageStatePath("manager") });

  test.beforeEach(() => {
    test.skip(
      !hasStorageState("manager"),
      "manager storageState missing — run auth setup"
    );
  });

  for (const route of MANAGER_SMOKE_ROUTES) {
    test(`${route.path} loads`, async ({ page }) => {
      // commit is enough for smoke; some finance pages are slow to fully load.
      page.setDefaultNavigationTimeout(90_000);
      const response = await page.goto(route.path, {
        waitUntil: "commit",
      });
      const status = response?.status() ?? 0;
      expect(status === 0 || (status >= 200 && status < 400)).toBeTruthy();

      if (route.expectUrl) {
        await expect(page).toHaveURL(route.expectUrl, { timeout: 60_000 });
      } else {
        await expect(page).toHaveURL(new RegExp(escapeRegExp(route.path)), {
          timeout: 60_000,
        });
      }

      await assertNoErrorOverlay(page);
      await expect(page.getByText(route.landmark).first()).toBeVisible({
        timeout: 60_000,
      });
      await expect(
        page.getByRole("button", { name: "Account menu" })
      ).toBeVisible();
    });
  }

  test("sidebar opens Manage users", async ({ page }) => {
    await page.goto("/manager/students");
    await page.getByRole("link", { name: "Manage users" }).click();
    await expect(page).toHaveURL(/\/manager\/users/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Manage users" })
    ).toBeVisible();
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
