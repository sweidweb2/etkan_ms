import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import {
  clearCachedSessionShell,
  getCachedSessionShell,
  getOrCreateSessionShellInflight,
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

  it("slides TTL on HIT so active hops stay warm", () => {
    setCachedSessionShell("user-1", payload, 1_000);
    vi.advanceTimersByTime(800);
    expect(getCachedSessionShell("user-1")).toEqual(payload);
    // Without sliding, 800+300 would expire the original 1s window.
    // Sliding uses SESSION_SHELL_TTL_MS on HIT, so still present.
    vi.advanceTimersByTime(300);
    expect(getCachedSessionShell("user-1")).toEqual(payload);
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

  it("coalesces overlapping builds for the same user", async () => {
    vi.useRealTimers();
    let builds = 0;
    let release!: (value: SessionShellPayload) => void;
    const build = () => {
      builds += 1;
      return new Promise<SessionShellPayload>((resolve) => {
        release = resolve;
      });
    };

    const first = getOrCreateSessionShellInflight("user-1", build);
    const second = getOrCreateSessionShellInflight("user-1", build);
    expect(builds).toBe(1);
    release(payload);
    const [a, b] = await Promise.all([first, second]);

    expect(a.shared).toBe(false);
    expect(b.shared).toBe(true);
    expect(a.payload).toEqual(payload);
    expect(b.payload).toEqual(payload);
    expect(builds).toBe(1);
  });

  it("runs a new build after the previous inflight settles", async () => {
    vi.useRealTimers();
    let builds = 0;
    const build = async () => {
      builds += 1;
      return payload;
    };

    await getOrCreateSessionShellInflight("user-1", build);
    await getOrCreateSessionShellInflight("user-1", build);
    expect(builds).toBe(2);
  });
});
