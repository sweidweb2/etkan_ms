import { describe, expect, it } from "vitest";
import {
  WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS,
  canAccessManageWorkshops,
} from "@/lib/auth/workshop-attribute-access";
import { PERMISSIONS } from "@/lib/constants/permissions";

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

describe("WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS", () => {
  it("is view-only workshops access for the attribute holder", () => {
    expect(WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS).toEqual([
      PERMISSIONS.WORKSHOPS_VIEW,
      PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
    ]);
    expect(WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS).not.toContain(
      PERMISSIONS.WORKSHOPS_CREATE
    );
    expect(WORKSHOP_ATTRIBUTE_READONLY_PERMISSIONS).not.toContain(
      PERMISSIONS.WORKSHOPS_SESSIONS_CREATE
    );
  });
});
