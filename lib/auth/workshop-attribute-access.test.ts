import { describe, expect, it } from "vitest";
import { canAccessManageWorkshops } from "@/lib/auth/workshop-attribute-access";

describe("canAccessManageWorkshops", () => {
  it("allows instructors", () => {
    expect(canAccessManageWorkshops({ isInstructor: true })).toBe(true);
  });

  it("denies when the instructor attribute is not set", () => {
    expect(canAccessManageWorkshops({})).toBe(false);
    expect(canAccessManageWorkshops({ isInstructor: false })).toBe(false);
  });
});
