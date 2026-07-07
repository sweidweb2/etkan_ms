import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_RATE_LIMITS } from "@/lib/constants/auth-limits";
import { checkAuthRateLimit } from "@/lib/rate-limit/auth-rate-limit";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit/memory-store";

const getClientIp = vi.fn();

vi.mock("@/lib/rate-limit/client-ip", () => ({
  getClientIp: () => getClientIp(),
}));

describe("checkAuthRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
    getClientIp.mockReset();
  });

  afterEach(() => {
    resetRateLimitStoreForTests();
  });

  it("blocks login after max attempts from the same IP", async () => {
    getClientIp.mockResolvedValue("203.0.113.1");
    const { maxAttempts } = AUTH_RATE_LIMITS.login;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await checkAuthRateLimit("login");
      expect(result).toEqual({ allowed: true });
    }

    const blocked = await checkAuthRateLimit("login");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.message).toContain("Too many sign-in attempts");
    }
  });

  it("uses one bucket per IP regardless of how many times it is called", async () => {
    getClientIp.mockResolvedValue("203.0.113.2");
    const { maxAttempts } = AUTH_RATE_LIMITS.login;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await checkAuthRateLimit("login");
    }

    const blocked = await checkAuthRateLimit("login");
    expect(blocked.allowed).toBe(false);
  });

  it("tracks signup attempts independently from login on the same IP", async () => {
    getClientIp.mockResolvedValue("203.0.113.3");
    const { maxAttempts } = AUTH_RATE_LIMITS.signup;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await checkAuthRateLimit("signup");
      expect(result).toEqual({ allowed: true });
    }

    const blockedSignup = await checkAuthRateLimit("signup");
    expect(blockedSignup.allowed).toBe(false);

    const loginAllowed = await checkAuthRateLimit("login");
    expect(loginAllowed).toEqual({ allowed: true });
  });

  it("uses independent buckets for different IPs", async () => {
    getClientIp.mockResolvedValue("203.0.113.4");
    const { maxAttempts } = AUTH_RATE_LIMITS.login;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await checkAuthRateLimit("login");
    }

    const blockedOnFirstIp = await checkAuthRateLimit("login");
    expect(blockedOnFirstIp.allowed).toBe(false);

    getClientIp.mockResolvedValue("203.0.113.5");
    const allowedOnSecondIp = await checkAuthRateLimit("login");
    expect(allowedOnSecondIp).toEqual({ allowed: true });
  });
});
