import { describe, expect, it } from "vitest";
import { canAccessManageWorkshops } from "@/lib/auth/workshop-attribute-access";
import { ROLES } from "@/lib/constants/roles";

describe("canAccessManageWorkshops", () => {
  it("allows instructors", () => {
    expect(canAccessManageWorkshops({ isInstructor: true })).toBe(true);
  });

  it("denies when the instructor attribute is not set", () => {
    expect(canAccessManageWorkshops({})).toBe(false);
    expect(canAccessManageWorkshops({ isInstructor: false })).toBe(false);
  });

  it("allows managers and supervisors by role without instructor", () => {
    expect(
      canAccessManageWorkshops({
        isInstructor: false,
        role: ROLES.MANAGER,
      })
    ).toBe(true);
    expect(
      canAccessManageWorkshops({
        isInstructor: false,
        role: ROLES.SUPERVISOR,
      })
    ).toBe(true);
  });

  it("still requires instructor for teacher and other roles", () => {
    expect(
      canAccessManageWorkshops({
        isInstructor: false,
        role: ROLES.TEACHER,
      })
    ).toBe(false);
    expect(
      canAccessManageWorkshops({
        isInstructor: false,
        role: ROLES.CEO,
      })
    ).toBe(false);
  });
});
