import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "@/lib/validators/auth/auth";

const validSignup = {
  username: "student1",
  fullName: "Jane Doe",
  email: "jane@school.com",
  password: "secret123",
  confirmPassword: "secret123",
  birthDate: "",
  phone: "",
};

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "jane@school.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short passwords", () => {
    const result = loginSchema.safeParse({
      email: "jane@school.com",
      password: "1234",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts valid registration input", () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
    }
  });

  it("rejects invalid usernames", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      username: "bad username!",
    });
    expect(result.success).toBe(false);
  });
});
