import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  isAdminPath,
  isLifePath,
  isPanelPath,
} from "@/lib/auth/path-access";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

describe("isPanelPath", () => {
  it("returns true for role panel roots and nested routes", () => {
    expect(isPanelPath(ROUTES.MANAGER_STUDENTS)).toBe(true);
    expect(isPanelPath(ROUTES.MANAGER_USERS)).toBe(true);
    expect(isPanelPath(ROUTES.ADMIN_DASHBOARD)).toBe(true);
  });

  it("returns false for public and auth routes", () => {
    expect(isPanelPath(ROUTES.HOME)).toBe(false);
    expect(isPanelPath(ROUTES.LOGIN)).toBe(false);
    expect(isPanelPath(ROUTES.SIGNUP)).toBe(false);
    expect(isPanelPath(ROUTES.LIFE)).toBe(false);
  });
});

describe("isLifePath", () => {
  it("matches Life index and nested blog routes", () => {
    expect(isLifePath(ROUTES.LIFE)).toBe(true);
    expect(isLifePath(`${ROUTES.LIFE}/b1`)).toBe(true);
    expect(isLifePath(ROUTES.HOME)).toBe(false);
  });
});


describe("canAccessPath", () => {
  it("allows a role to access its own panel routes", () => {
    expect(canAccessPath(ROUTES.MANAGER_USERS, ROLES.MANAGER)).toBe(true);
    expect(canAccessPath(ROUTES.MANAGER_STUDENTS, ROLES.MANAGER)).toBe(true);
    expect(canAccessPath(ROUTES.STUDENT_DASHBOARD, ROLES.STUDENT)).toBe(true);
    expect(canAccessPath(ROUTES.CO_MANAGER_DASHBOARD, ROLES.CO_MANAGER)).toBe(
      true
    );
    expect(canAccessPath(ROUTES.TRAINER_DASHBOARD, ROLES.TRAINER)).toBe(true);
    expect(
      canAccessPath(ROUTES.SUPERVISOR_DASHBOARD, ROLES.SUPERVISOR)
    ).toBe(true);
  });

  it("denies cross-role panel access", () => {
    expect(canAccessPath(ROUTES.ADMIN_DASHBOARD, ROLES.MANAGER)).toBe(false);
    expect(canAccessPath(ROUTES.MANAGER_USERS, ROLES.STUDENT)).toBe(false);
    expect(canAccessPath(ROUTES.CEO_ROOT, ROLES.TEACHER)).toBe(false);
    expect(canAccessPath(ROUTES.MANAGER_STUDENTS, ROLES.CO_MANAGER)).toBe(
      false
    );
    expect(canAccessPath(ROUTES.TEACHER_DASHBOARD, ROLES.TRAINER)).toBe(false);
    expect(
      canAccessPath(ROUTES.SUPERVISOR_DASHBOARD, ROLES.MANAGER)
    ).toBe(false);
  });

  it("allows shared workshop paths for any role", () => {
    expect(canAccessPath(ROUTES.MANAGER_WORKSHOPS, ROLES.TRAINER)).toBe(true);
    expect(
      canAccessPath(`${ROUTES.MANAGER_WORKSHOPS}/abc`, ROLES.TEACHER)
    ).toBe(true);
    expect(
      canAccessPath(ROUTES.MANAGER_WORKSHOPS_PAYMENTS, ROLES.STUDENT)
    ).toBe(true);
    expect(
      canAccessPath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES, ROLES.TRAINER)
    ).toBe(true);
    expect(canAccessPath(ROUTES.MANAGER_INSTRUCTORS, ROLES.CEO)).toBe(true);
    expect(
      canAccessPath(ROUTES.MANAGER_CLOUDFLARE_AI_USAGE, ROLES.CEO)
    ).toBe(true);
    expect(
      canAccessPath(ROUTES.MANAGER_INCOME_STATEMENT_ANALYTICS, ROLES.CEO)
    ).toBe(true);
    expect(canAccessPath(ROUTES.MANAGER_GUESTS, ROLES.CEO)).toBe(true);
    expect(
      canAccessPath(`${ROUTES.MANAGER_GUESTS}/abc-123`, ROLES.CEO)
    ).toBe(true);
    expect(canAccessPath(ROUTES.MANAGER_REGISTRATIONS, ROLES.CEO)).toBe(true);
  });

  it("allows supervisor to enter manager paths (layout hard-blocks excluded)", () => {
    expect(canAccessPath(ROUTES.MANAGER_STUDENTS, ROLES.SUPERVISOR)).toBe(
      true
    );
    expect(canAccessPath(ROUTES.MANAGER_CLASSES, ROLES.SUPERVISOR)).toBe(true);
    expect(canAccessPath(ROUTES.MANAGER_WORKSHOPS, ROLES.SUPERVISOR)).toBe(
      true
    );
    expect(canAccessPath(ROUTES.MANAGER_ACCOUNTING, ROLES.SUPERVISOR)).toBe(
      true
    );
  });

  it("still denies non-shared manager paths for other roles", () => {
    expect(canAccessPath(ROUTES.MANAGER_USERS, ROLES.TRAINER)).toBe(false);
    expect(canAccessPath(ROUTES.MANAGER_INCOME_STATEMENT, ROLES.CEO)).toBe(
      false
    );
  });

  it("allows non-panel routes for any role", () => {
    expect(canAccessPath(ROUTES.HOME, ROLES.STUDENT)).toBe(true);
    expect(canAccessPath(ROUTES.HOME, ROLES.ADMIN)).toBe(true);
  });

  it("allows Life routes only for admin", () => {
    expect(canAccessPath(ROUTES.LIFE, ROLES.ADMIN)).toBe(true);
    expect(canAccessPath(`${ROUTES.LIFE}/b1`, ROLES.ADMIN)).toBe(true);
    expect(canAccessPath(ROUTES.LIFE, ROLES.MANAGER)).toBe(false);
    expect(canAccessPath(ROUTES.LIFE, ROLES.STUDENT)).toBe(false);
  });
});

describe("isAdminPath", () => {
  it("identifies admin panel paths only", () => {
    expect(isAdminPath(ROUTES.ADMIN_DASHBOARD)).toBe(true);
    expect(isAdminPath(ROUTES.MANAGER_STUDENTS)).toBe(false);
  });
});
