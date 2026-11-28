import { expect, test } from "@playwright/test";
import {
  DEFAULT_SETUP_ROLES,
  E2E_ROLES,
  hasStorageState,
  REQUIRED_AUTH_ROLES,
  ROLE_HOME,
  storageStatePath,
  type E2eRole,
} from "../fixtures/auth";

const setupAllRoles = process.env.E2E_SETUP_ALL_ROLES === "1";
const rolesToCheck: readonly E2eRole[] = setupAllRoles
  ? E2E_ROLES
  : DEFAULT_SETUP_ROLES;

/**
 * Validates each role home using storageState from setup (no second UI login).
 * Skips optional roles when demo seed did not produce a session.
 */
test.describe("auth redirect by role", () => {
  for (const role of rolesToCheck) {
    test(`${role} session opens ${ROLE_HOME[role]}`, async ({ browser }) => {
      const required = (REQUIRED_AUTH_ROLES as readonly E2eRole[]).includes(
        role
      );

      if (!hasStorageState(role)) {
        test.skip(
          !required,
          `No storageState for optional role "${role}" — run npm run seed:demo or set E2E_* credentials`
        );
        throw new Error(
          `Required role "${role}" missing storageState — auth setup failed`
        );
      }

      const context = await browser.newContext({
        storageState: storageStatePath(role),
      });
      const page = await context.newPage();
      await page.goto(ROLE_HOME[role], { waitUntil: "commit" });
      await expect(page).toHaveURL(new RegExp(escapeRegExp(ROLE_HOME[role])), {
        timeout: 15_000,
      });
      await expect(
        page.getByRole("button", { name: "Account menu" })
      ).toBeVisible({ timeout: 15_000 });
      await context.close();
    });
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
