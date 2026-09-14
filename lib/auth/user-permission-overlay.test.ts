import { describe, expect, it } from "vitest";
import {
  normalizeAllowKeys,
  stripRedundantAllows,
  toOverlayAllowRows,
} from "@/lib/auth/user-permission-overlay";
import { PERMISSIONS } from "@/lib/constants/permissions";

describe("user-permission-overlay", () => {
  it("normalizeAllowKeys skips deny and invalid keys", () => {
    expect(
      normalizeAllowKeys([
        { permission_key: PERMISSIONS.USERS_VIEW, effect: "allow" },
        { permission_key: "not.real", effect: "allow" },
        { permission_key: PERMISSIONS.USERS_CREATE, effect: "deny" },
        { permission_key: PERMISSIONS.USERS_VIEW },
      ])
    ).toEqual([PERMISSIONS.USERS_VIEW]);
  });

  it("stripRedundantAllows removes role-covered keys", () => {
    expect(
      stripRedundantAllows(
        [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE],
        new Set([PERMISSIONS.USERS_VIEW])
      )
    ).toEqual([PERMISSIONS.USERS_CREATE]);
  });

  it("toOverlayAllowRows tags effect allow", () => {
    expect(toOverlayAllowRows([PERMISSIONS.USERS_VIEW])).toEqual([
      { permission_key: PERMISSIONS.USERS_VIEW, effect: "allow" },
    ]);
  });
});
