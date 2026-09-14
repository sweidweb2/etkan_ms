import { describe, expect, it } from "vitest";
import {
  UNAUTHORIZED_MESSAGE,
  hasAllPermissionsInSet,
  hasAnyPermissionInSet,
  hasPermissionInSet,
  mergePermissionSets,
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

  describe("mergePermissionSets", () => {
    it("unions role keys with allows beyond the role", () => {
      const effective = mergePermissionSets({
        roleKeys: [PERMISSIONS.SUBJECTS_VIEW],
        allows: [PERMISSIONS.SUBJECTS_CREATE],
      });

      expect(effective.has(PERMISSIONS.SUBJECTS_VIEW)).toBe(true);
      expect(effective.has(PERMISSIONS.SUBJECTS_CREATE)).toBe(true);
      expect(effective.size).toBe(2);
    });

    it("optional denies still remove keys when provided", () => {
      const effective = mergePermissionSets({
        roleKeys: [PERMISSIONS.SUBJECTS_VIEW, PERMISSIONS.SUBJECTS_CREATE],
        denies: [PERMISSIONS.SUBJECTS_CREATE],
      });

      expect(effective.has(PERMISSIONS.SUBJECTS_VIEW)).toBe(true);
      expect(effective.has(PERMISSIONS.SUBJECTS_CREATE)).toBe(false);
    });

    it("skips invalid keys", () => {
      const effective = mergePermissionSets({
        roleKeys: [PERMISSIONS.SUBJECTS_VIEW, "not.a.key"],
        allows: ["also.fake"],
      });

      expect([...effective]).toEqual([PERMISSIONS.SUBJECTS_VIEW]);
    });
  });
});
