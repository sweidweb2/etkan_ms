import { describe, expect, it } from "vitest";
import {
  getPostLoginRedirect,
  getSafeRedirectPath,
} from "@/lib/auth/redirect";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";

describe("getSafeRedirectPath", () => {
  it("returns valid relative paths unchanged", () => {
    expect(getSafeRedirectPath("/manager/students")).toBe("/manager/students");
  });

  it("rejects protocol-relative and invalid paths", () => {
    expect(getSafeRedirectPath("//evil.com")).toBe(ROUTES.HOME);
    expect(getSafeRedirectPath(null)).toBe(ROUTES.HOME);
    expect(getSafeRedirectPath("https://evil.com")).toBe(ROUTES.HOME);
  });
});

describe("getPostLoginRedirect", () => {
  it("redirects each role to its dashboard by default", () => {
    expect(getPostLoginRedirect(ROLES.MANAGER)).toBe(ROUTES.MANAGER_STUDENTS);
    expect(getPostLoginRedirect(ROLES.STUDENT)).toBe(ROUTES.STUDENT_DASHBOARD);
    expect(getPostLoginRedirect(ROLES.ADMIN)).toBe(ROUTES.ADMIN_DASHBOARD);
    expect(getPostLoginRedirect(ROLES.CO_MANAGER)).toBe(
      ROUTES.CO_MANAGER_DASHBOARD
    );
    expect(getPostLoginRedirect(ROLES.TRAINER)).toBe(ROUTES.TRAINER_DASHBOARD);
  });

  it("honors next when path is allowed for the role", () => {
    expect(getPostLoginRedirect(ROLES.MANAGER, "/manager/subjects")).toBe(
      "/manager/subjects"
    );
  });

  it("ignores next for auth-only paths", () => {
    expect(getPostLoginRedirect(ROLES.STUDENT, ROUTES.LOGIN)).toBe(
      ROUTES.STUDENT_DASHBOARD
    );
    expect(getPostLoginRedirect(ROLES.STUDENT, ROUTES.SIGNUP)).toBe(
      ROUTES.STUDENT_DASHBOARD
    );
  });

  it("ignores next when path belongs to another role panel", () => {
    expect(getPostLoginRedirect(ROLES.STUDENT, ROUTES.MANAGER_USERS)).toBe(
      ROUTES.STUDENT_DASHBOARD
    );
  });

  it("honors Life next only for admin", () => {
    expect(getPostLoginRedirect(ROLES.ADMIN, ROUTES.LIFE)).toBe(ROUTES.LIFE);
    expect(getPostLoginRedirect(ROLES.MANAGER, ROUTES.LIFE)).toBe(
      ROUTES.MANAGER_STUDENTS
    );
  });
});
