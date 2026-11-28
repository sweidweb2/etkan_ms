import { expect, test } from "@playwright/test";
import {
  hasStorageState,
  ROLE_HOME,
  storageStatePath,
  type E2eRole,
} from "../fixtures/auth";
import { assertNoErrorOverlay } from "../helpers/assert-no-error-overlay";

/**
 * Thin homes for staff roles seeded by `npm run seed:demo` (+ seed:admin).
 * Uses browser.newContext so missing storageState can skip (test.use cannot).
 */
const STAFF_SMOKES: ReadonlyArray<{
  role: E2eRole;
  path: string;
  landmark: string | RegExp;
  expectUrl: RegExp;
}> = [
  {
    role: "admin",
    path: "/admin",
    landmark: "Admin",
    expectUrl: /\/admin(?:\/|$|\?)/,
  },
  {
    role: "ceo",
    path: "/ceo",
    landmark: "Manage instructors",
    expectUrl: /\/manager\/instructors/,
  },
  {
    role: "crm",
    path: "/crm",
    landmark: "Guests",
    expectUrl: /\/manager\/guests/,
  },
  {
    role: "supervisor",
    path: "/supervisor",
    landmark: "Manage students",
    expectUrl: /\/manager\/students/,
  },
  {
    role: "co-manager",
    path: "/co-manager",
    landmark: "Co-manager",
    expectUrl: /\/co-manager(?:\/|$|\?)/,
  },
];

test.describe("staff smoke nav @smoke", () => {
  for (const smoke of STAFF_SMOKES) {
    test(`${smoke.role} home lands on ${ROLE_HOME[smoke.role]}`, async ({
      browser,
    }) => {
      test.skip(
        !hasStorageState(smoke.role),
        `${smoke.role} storageState missing — run npm run seed:demo (and seed:admin for admin)`
      );

      const context = await browser.newContext({
        storageState: storageStatePath(smoke.role),
      });
      const page = await context.newPage();
      try {
        await page.goto(smoke.path, { waitUntil: "commit" });
        await expect(page).toHaveURL(smoke.expectUrl, { timeout: 20_000 });
        await assertNoErrorOverlay(page);
        await expect(page.getByText(smoke.landmark).first()).toBeVisible({
          timeout: 15_000,
        });
        await expect(
          page.getByRole("button", { name: "Account menu" })
        ).toBeVisible();
      } finally {
        await context.close();
      }
    });
  }
});
