import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import {
  clearClaimsRoleOverride,
  getClaimsRoleOverride,
  markClaimsRoleOverride,
  resolveEffectiveClaimsRole,
} from "@/lib/auth/claims-role-override-cache";

describe("claims-role-override-cache", () => {
  beforeEach(() => {
    clearClaimsRoleOverride();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearClaimsRoleOverride();
  });

  it("stores and returns an override", () => {
    markClaimsRoleOverride("user-1", ROLES.STUDENT);
    expect(getClaimsRoleOverride("user-1")).toBe(ROLES.STUDENT);
  });

  it("expires after TTL", () => {
    markClaimsRoleOverride("user-1", ROLES.STUDENT, 1_000);
    vi.advanceTimersByTime(1_001);
    expect(getClaimsRoleOverride("user-1")).toBeNull();
  });

  it("forces demoted role while JWT claims stay elevated", () => {
    markClaimsRoleOverride("user-1", ROLES.STUDENT);
    expect(
      resolveEffectiveClaimsRole("user-1", ROLES.MANAGER)
    ).toBe(ROLES.STUDENT);
    expect(getClaimsRoleOverride("user-1")).toBe(ROLES.STUDENT);
  });

  it("clears override when JWT catches up", () => {
    markClaimsRoleOverride("user-1", ROLES.STUDENT);
    expect(
      resolveEffectiveClaimsRole("user-1", ROLES.STUDENT)
    ).toBe(ROLES.STUDENT);
    expect(getClaimsRoleOverride("user-1")).toBeNull();
  });

  it("passes through claims when no override exists", () => {
    expect(
      resolveEffectiveClaimsRole("user-1", ROLES.MANAGER)
    ).toBe(ROLES.MANAGER);
    expect(resolveEffectiveClaimsRole("user-1", null)).toBeNull();
  });
});
