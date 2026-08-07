import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import {
  clearCachedSessionShell,
  getCachedSessionShell,
  isSessionShellCompatibleWithClaims,
  setCachedSessionShell,
  type SessionShellPayload,
} from "@/lib/auth/session-shell-cache";

const payload: SessionShellPayload = {
  role: ROLES.CEO,
  displayName: "Ceo User",
  isInstructor: true,
  permissionKeys: [PERMISSIONS.INSTRUCTORS_VIEW, PERMISSIONS.WORKSHOPS_VIEW],
  cachedClaimsRole: ROLES.CEO,
};

describe("session-shell-cache", () => {
  beforeEach(() => {
    clearCachedSessionShell();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearCachedSessionShell();
  });

  it("returns null on miss", () => {
    expect(getCachedSessionShell("user-1")).toBeNull();
  });

  it("stores and returns a shell payload", () => {
    setCachedSessionShell("user-1", payload);
    expect(getCachedSessionShell("user-1")).toEqual(payload);
  });

  it("expires after TTL", () => {
    setCachedSessionShell("user-1", payload, 1_000);
    vi.advanceTimersByTime(1_001);
    expect(getCachedSessionShell("user-1")).toBeNull();
  });

  it("clears one user without affecting others", () => {
    setCachedSessionShell("user-1", payload);
    setCachedSessionShell("user-2", {
      ...payload,
      displayName: "Other",
      role: ROLES.MANAGER,
    });
    clearCachedSessionShell("user-1");
    expect(getCachedSessionShell("user-1")).toBeNull();
    expect(getCachedSessionShell("user-2")?.displayName).toBe("Other");
  });

  it("clears all when userId omitted", () => {
    setCachedSessionShell("user-1", payload);
    setCachedSessionShell("user-2", payload);
    clearCachedSessionShell();
    expect(getCachedSessionShell("user-1")).toBeNull();
    expect(getCachedSessionShell("user-2")).toBeNull();
  });

  it("is compatible when claimsRole is null", () => {
    expect(isSessionShellCompatibleWithClaims(payload, null)).toBe(true);
  });

  it("is compatible when claimsRole matches cached role", () => {
    expect(isSessionShellCompatibleWithClaims(payload, ROLES.CEO)).toBe(true);
  });

  it("busts when claimsRole differs from cached role", () => {
    expect(isSessionShellCompatibleWithClaims(payload, ROLES.MANAGER)).toBe(
      false
    );
  });
});
