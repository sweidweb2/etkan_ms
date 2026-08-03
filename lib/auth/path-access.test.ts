import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  isAdminPath,
  isPanelPath,
} from "@/lib/auth/path-access";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

describe("isPanelPath", () => {
  it("returns true for role panel roots and nested routes", () => {
    expect(isPanelPath(ROUTES.MANAGER_DASHBOARD)).toBe(true);
    expect(isPanelPath(ROUTES.MANAGER_USERS)).toBe(true);
    expect(isPanelPath(ROUTES.ADMIN_DASHBOARD)).toBe(true);
  });

  it("returns false for public and auth routes", () => {
    expect(isPanelPath(ROUTES.HOME)).toBe(false);
    expect(isPanelPath(ROUTES.LOGIN)).toBe(false);
    expect(isPanelPath(ROUTES.SIGNUP)).toBe(false);
  });
});

describe("canAccessPath", () => {
  it("allows a role to access its own panel routes", () => {
    expect(canAccessPath(ROUTES.MANAGER_DASHBOARD, ROLES.MANAGER)).toBe(true);
    expect(canAccessPath(ROUTES.MANAGER_STUDENTS, ROLES.MANAGER)).toBe(true);
    expect(canAccessPath(ROUTES.STUDENT_DASHBOARD, ROLES.STUDENT)).toBe(true);
    expect(canAccessPath(ROUTES.CO_MANAGER_DASHBOARD, ROLES.CO_MANAGER)).toBe(
      true
    );
    expect(canAccessPath(ROUTES.TRAINER_DASHBOARD, ROLES.TRAINER)).toBe(true);
  });

  it("denies cross-role panel access", () => {
    expect(canAccessPath(ROUTES.ADMIN_DASHBOARD, ROLES.MANAGER)).toBe(false);
    expect(canAccessPath(ROUTES.MANAGER_USERS, ROLES.STUDENT)).toBe(false);
    expect(canAccessPath(ROUTES.CEO_DASHBOARD, ROLES.TEACHER)).toBe(false);
    expect(canAccessPath(ROUTES.MANAGER_DASHBOARD, ROLES.CO_MANAGER)).toBe(
      false
    );
    expect(canAccessPath(ROUTES.TEACHER_DASHBOARD, ROLES.TRAINER)).toBe(false);
  });

  it("allows instructor feature routes only when isInstructor is true", () => {
    expect(
      canAccessPath(ROUTES.INSTRUCTOR_DASHBOARD, ROLES.TEACHER, {
        isInstructor: true,
      })
    ).toBe(true);
    expect(
      canAccessPath(ROUTES.INSTRUCTOR_DASHBOARD, ROLES.TEACHER, {
        isInstructor: false,
      })
    ).toBe(false);
    expect(canAccessPath(ROUTES.INSTRUCTOR_DASHBOARD, ROLES.MANAGER)).toBe(
      false
    );
  });

  it("allows non-panel routes for any role", () => {
    expect(canAccessPath(ROUTES.HOME, ROLES.STUDENT)).toBe(true);
    expect(canAccessPath(ROUTES.HOME, ROLES.ADMIN)).toBe(true);
  });
});

describe("isAdminPath", () => {
  it("identifies admin panel paths only", () => {
    expect(isAdminPath(ROUTES.ADMIN_DASHBOARD)).toBe(true);
    expect(isAdminPath(ROUTES.MANAGER_DASHBOARD)).toBe(false);
  });
});
