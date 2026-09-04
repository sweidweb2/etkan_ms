import { describe, expect, it } from "vitest";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { generateStrongPassword } from "@/lib/utils/generate-strong-password";

describe("generateStrongPassword", () => {
  it("returns a password within auth length limits", () => {
    const password = generateStrongPassword();

    expect(password.length).toBeGreaterThanOrEqual(AUTH_LIMITS.password.min);
    expect(password.length).toBeLessThanOrEqual(AUTH_LIMITS.password.max);
  });

  it("includes lower, upper, digit, and symbol characters", () => {
    const password = generateStrongPassword(20);

    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%^&*\-_=+?]/);
  });

  it("respects an explicit length within bounds", () => {
    expect(generateStrongPassword(12)).toHaveLength(12);
  });
});
