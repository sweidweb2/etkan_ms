import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCachedRolePermissionKeys,
  getCachedRolePermissionKeys,
  setCachedRolePermissionKeys,
} from "@/lib/auth/role-permissions-cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";

describe("role-permissions-cache", () => {
  beforeEach(() => {
    clearCachedRolePermissionKeys();
  });

  it("returns null when empty", () => {
    expect(getCachedRolePermissionKeys(ROLES.MANAGER)).toBeNull();
  });

  it("returns cached keys within TTL", () => {
    setCachedRolePermissionKeys(
      ROLES.MANAGER,
      [PERMISSIONS.DASHBOARD_VIEW],
      60_000
    );
    expect(getCachedRolePermissionKeys(ROLES.MANAGER)).toEqual([
      PERMISSIONS.DASHBOARD_VIEW,
    ]);
  });

  it("expires after TTL", () => {
    setCachedRolePermissionKeys(
      ROLES.MANAGER,
      [PERMISSIONS.DASHBOARD_VIEW],
      -1
    );
    expect(getCachedRolePermissionKeys(ROLES.MANAGER)).toBeNull();
  });

  it("clears one role without clearing others", () => {
    setCachedRolePermissionKeys(ROLES.MANAGER, [PERMISSIONS.DASHBOARD_VIEW]);
    setCachedRolePermissionKeys(ROLES.TEACHER, [PERMISSIONS.CLASSES_VIEW]);
    clearCachedRolePermissionKeys(ROLES.MANAGER);
    expect(getCachedRolePermissionKeys(ROLES.MANAGER)).toBeNull();
    expect(getCachedRolePermissionKeys(ROLES.TEACHER)).toEqual([
      PERMISSIONS.CLASSES_VIEW,
    ]);
  });

  it("clears all roles when role omitted", () => {
    setCachedRolePermissionKeys(ROLES.MANAGER, [PERMISSIONS.DASHBOARD_VIEW]);
    setCachedRolePermissionKeys(ROLES.CEO, [PERMISSIONS.WORKSHOPS_VIEW]);
    clearCachedRolePermissionKeys();
    expect(getCachedRolePermissionKeys(ROLES.MANAGER)).toBeNull();
    expect(getCachedRolePermissionKeys(ROLES.CEO)).toBeNull();
  });
});
