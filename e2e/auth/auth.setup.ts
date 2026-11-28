import { test as setup } from "@playwright/test";
import {
  DEFAULT_SETUP_ROLES,
  E2E_ROLES,
  ensureAuthDir,
  getCredentials,
  loginViaUi,
  REQUIRED_AUTH_ROLES,
  ROLE_HOME,
  STAFF_SETUP_ROLES,
  type E2eRole,
  storageStatePath,
} from "../fixtures/auth";

ensureAuthDir();

const setupAllRoles = process.env.E2E_SETUP_ALL_ROLES === "1";
const setupStaff = process.env.E2E_SETUP_STAFF !== "0";
const rolesToSetup: readonly E2eRole[] = setupAllRoles
  ? E2E_ROLES
  : [
      ...DEFAULT_SETUP_ROLES,
      ...(setupStaff ? STAFF_SETUP_ROLES : []),
    ];

const required = new Set<E2eRole>(REQUIRED_AUTH_ROLES);

/**
 * Keep workers=1 for setup. Do not use serial mode — a bad manager password
 * must not block teacher/student storageState. Only manager is required;
 * teacher/student skip when demo seed is missing (fail-fast login timeouts).
 */
for (const role of rolesToSetup) {
  setup(`authenticate as ${role}`, async ({ page }, testInfo) => {
    try {
      await loginViaUi(page, getCredentials(role), ROLE_HOME[role]);
      await page.context().storageState({ path: storageStatePath(role) });
    } catch (error) {
      const hint =
        role === "manager"
          ? " Set E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD to match your seeded manager (seed:manager defaults may differ)."
          : " Run npm run seed:demo (and seed:admin / seed:manager) or set E2E_* credentials.";

      if (required.has(role)) {
        throw new Error(
          `Failed to authenticate required role "${role}".${hint} Underlying: ${String(error)}`
        );
      }
      testInfo.skip(
        true,
        `Optional role "${role}" not available.${hint} ${String(error)}`
      );
    }
  });
}
