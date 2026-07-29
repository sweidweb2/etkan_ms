import { describe, expect, it } from "vitest";
import {
  UNAUTHORIZED_MESSAGE,
  hasAllPermissionsInSet,
  hasAnyPermissionInSet,
  hasPermissionInSet,
  requirePermissionInSet,
} from "@/lib/auth/permission-checks";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";

describe("permission-checks", () => {
  const permissions = new Set<PermissionKey>([
    PERMISSIONS.SUBJECTS_VIEW,
    PERMISSIONS.SUBJECTS_CREATE,
  ]);

  it("hasPermissionInSet validates keys and membership", () => {
    expect(hasPermissionInSet(permissions, PERMISSIONS.SUBJECTS_VIEW)).toBe(
      true
    );
    expect(hasPermissionInSet(permissions, PERMISSIONS.SUBJECTS_DELETE)).toBe(
      false
    );
    expect(hasPermissionInSet(permissions, "not.a.key")).toBe(false);
  });

  it("hasAny / hasAll work as expected", () => {
    expect(
      hasAnyPermissionInSet(permissions, [
        PERMISSIONS.SUBJECTS_DELETE,
        PERMISSIONS.SUBJECTS_CREATE,
      ])
    ).toBe(true);
    expect(
      hasAllPermissionsInSet(permissions, [
        PERMISSIONS.SUBJECTS_VIEW,
        PERMISSIONS.SUBJECTS_CREATE,
      ])
    ).toBe(true);
    expect(
      hasAllPermissionsInSet(permissions, [
        PERMISSIONS.SUBJECTS_VIEW,
        PERMISSIONS.SUBJECTS_DELETE,
      ])
    ).toBe(false);
  });

  it("requirePermissionInSet throws when missing", () => {
    expect(() =>
      requirePermissionInSet(permissions, PERMISSIONS.SUBJECTS_CREATE)
    ).not.toThrow();
    expect(() =>
      requirePermissionInSet(permissions, PERMISSIONS.SUBJECTS_DELETE)
    ).toThrow(UNAUTHORIZED_MESSAGE);
  });
});
