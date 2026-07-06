import { describe, expect, it } from "vitest";
import {
  baseUsernameFromEmail,
  usernameWithSuffix,
} from "@/lib/auth/username";

describe("baseUsernameFromEmail", () => {
  it("sanitizes the local part of an email", () => {
    expect(baseUsernameFromEmail("Jane.Doe@school.com")).toBe("jane_doe");
  });

  it("falls back when local part is empty after sanitization", () => {
    expect(baseUsernameFromEmail("@school.com")).toBe("user");
  });
});

describe("usernameWithSuffix", () => {
  it("appends a numeric suffix without exceeding length bounds", () => {
    expect(usernameWithSuffix("student", 2)).toBe("student2");
  });
});
