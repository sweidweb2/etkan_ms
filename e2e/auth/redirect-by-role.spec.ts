import { expect, test } from "@playwright/test";
import {
  E2E_ROLES,
  getCredentials,
  hasStorageState,
  loginViaUi,
  REQUIRED_AUTH_ROLES,
  ROLE_HOME,
  type E2eRole,
} from "../fixtures/auth";

const setupAllRoles = process.env.E2E_SETUP_ALL_ROLES === "1";
const rolesToCheck: readonly E2eRole[] = setupAllRoles
  ? E2E_ROLES
  : REQUIRED_AUTH_ROLES;

test.describe("auth redirect by role", () => {
  test.describe.configure({ mode: "serial" });

  for (const role of rolesToCheck) {
    test(`${role} lands on ${ROLE_HOME[role]}`, async ({ page }) => {
      const required = (REQUIRED_AUTH_ROLES as readonly E2eRole[]).includes(
        role
      );
      if (!required && !hasStorageState(role)) {
        test.skip(
          true,
          `No storageState for optional role "${role}" — seed or set E2E_SETUP_ALL_ROLES=1`
        );
      }

      try {
        await loginViaUi(page, getCredentials(role), ROLE_HOME[role]);
      } catch (error) {
        if (!required) {
          test.skip(
            true,
            `Optional role "${role}" login failed: ${String(error)}`
          );
        }
        throw error;
      }

      await expect(page).toHaveURL(new RegExp(ROLE_HOME[role]));
    });
  }
});
