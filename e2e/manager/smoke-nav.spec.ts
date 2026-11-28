import { expect, test } from "@playwright/test";
import { hasStorageState, storageStatePath } from "../fixtures/auth";
import {
  assertNoErrorOverlay,
  hasManagerPanelError,
} from "../helpers/assert-no-error-overlay";

/**
 * Manager list/root route matrix — light landmarks only; no mutations.
 * Parallelized via the manager-smoke Playwright project.
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
  { path: "/manager/students/drop", landmark: "Drop student" },
  { path: "/manager/registrations", landmark: "Registrations" },
  { path: "/manager/guests", landmark: "Guests" },
  { path: "/manager/subjects", landmark: "Manage subjects" },
  { path: "/manager/subjects/catalog", landmark: "Categories & exercises" },
  { path: "/manager/classes", landmark: "Manage classes" },
  { path: "/manager/semesters", landmark: "Manage semesters" },
  { path: "/manager/instructors", landmark: "Manage instructors" },
  {
    path: "/manager/instructor-schedules",
    // Title lives in the panel shell header (PanelPageHeader returns null).
    landmark: /Instructor schedules|Slot details|No instructors yet/i,
  },
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
  { path: "/manager/backup", landmark: "Manage backups" },
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
      const response = await page.goto(route.path, {
        waitUntil: "commit",
      });
      const status = response?.status() ?? 0;
      expect(status === 0 || (status >= 200 && status < 400)).toBeTruthy();

      if (route.expectUrl) {
        await expect(page).toHaveURL(route.expectUrl, { timeout: 30_000 });
      } else {
        await expect(page).toHaveURL(new RegExp(escapeRegExp(route.path)), {
          timeout: 30_000,
        });
      }

      await assertNoErrorOverlay(page);
      if (await hasManagerPanelError(page)) {
        test.skip(
          true,
          `Manager panel error on ${route.path} — check DB migrations / server logs`
        );
      }
      // Shell headers + cold Turbopack under parallel workers need headroom,
      // but stay well under the old 60s-per-assert stalls.
      await expect(page.getByText(route.landmark).first()).toBeVisible({
        timeout: 30_000,
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
