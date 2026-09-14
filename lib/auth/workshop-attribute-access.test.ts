import { describe, expect, it } from "vitest";
import { canAccessManageWorkshops } from "@/lib/auth/workshop-attribute-access";

describe("canAccessManageWorkshops", () => {
  it("allows instructors and mentors", () => {
    expect(canAccessManageWorkshops({ isInstructor: true })).toBe(true);
    expect(canAccessManageWorkshops({ isMentor: true })).toBe(true);
    expect(
      canAccessManageWorkshops({ isInstructor: true, isMentor: true })
    ).toBe(true);
  });

  it("denies when neither attribute is set", () => {
    expect(canAccessManageWorkshops({})).toBe(false);
    expect(
      canAccessManageWorkshops({ isInstructor: false, isMentor: false })
    ).toBe(false);
  });
});
