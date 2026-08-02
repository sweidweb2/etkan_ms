import { describe, expect, it } from "vitest";
import { getRequiredViewPermissionForManagerPath } from "@/lib/auth/manager-route-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";

describe("getRequiredViewPermissionForManagerPath", () => {
  it("maps top-level manager list routes", () => {
    expect(getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_DASHBOARD)).toBe(
      PERMISSIONS.DASHBOARD_VIEW
    );
    expect(getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_SUBJECTS)).toBe(
      PERMISSIONS.SUBJECTS_VIEW
    );
    expect(getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_WORKSHOPS)).toBe(
      PERMISSIONS.WORKSHOPS_VIEW
    );
    expect(getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_USERS)).toBe(
      PERMISSIONS.USERS_VIEW
    );
    expect(getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_SETTINGS)).toBe(
      PERMISSIONS.SETTINGS_VIEW
    );
    expect(getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_RBAC)).toBe(
      PERMISSIONS.RBAC_MANAGE
    );
  });

  it("maps detail routes under the same feature prefix", () => {
    expect(
      getRequiredViewPermissionForManagerPath("/manager/subjects/abc-123")
    ).toBe(PERMISSIONS.SUBJECTS_VIEW);
    expect(
      getRequiredViewPermissionForManagerPath("/manager/students/stu-1")
    ).toBe(PERMISSIONS.STUDENTS_VIEW);
    expect(getRequiredViewPermissionForManagerPath("/manager/sent/mail-9")).toBe(
      PERMISSIONS.EMAILING_VIEW
    );
  });

  it("maps nested class grades / sessions / tasks before classes.view", () => {
    expect(
      getRequiredViewPermissionForManagerPath(
        "/manager/classes/c1/grades"
      )
    ).toBe(PERMISSIONS.GRADES_VIEW);
    expect(
      getRequiredViewPermissionForManagerPath(
        "/manager/classes/c1/grades/students/s1"
      )
    ).toBe(PERMISSIONS.GRADES_VIEW);
    expect(
      getRequiredViewPermissionForManagerPath(
        "/manager/classes/c1/sessions/sess-1"
      )
    ).toBe(PERMISSIONS.SESSIONS_VIEW);
    expect(
      getRequiredViewPermissionForManagerPath(
        "/manager/classes/c1/sessions/sess-1/tasks/t1"
      )
    ).toBe(PERMISSIONS.TASKS_VIEW);
    expect(
      getRequiredViewPermissionForManagerPath("/manager/classes/c1")
    ).toBe(PERMISSIONS.CLASSES_VIEW);
    expect(
      getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_CLASSES)
    ).toBe(PERMISSIONS.CLASSES_VIEW);
  });

  it("maps equipment borrow before equipment list", () => {
    expect(
      getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_EQUIPMENT_BORROW)
    ).toBe(PERMISSIONS.EQUIPMENT_VIEW_BORROWS);
    expect(
      getRequiredViewPermissionForManagerPath("/manager/equipments/eq-1")
    ).toBe(PERMISSIONS.EQUIPMENT_VIEW);
  });

  it("returns null for non-manager and unknown manager paths", () => {
    expect(getRequiredViewPermissionForManagerPath(ROUTES.HOME)).toBeNull();
    expect(
      getRequiredViewPermissionForManagerPath(ROUTES.TEACHER_DASHBOARD)
    ).toBeNull();
    expect(getRequiredViewPermissionForManagerPath(ROUTES.MANAGER_ROOT)).toBeNull();
    expect(
      getRequiredViewPermissionForManagerPath("/manager/unknown-feature")
    ).toBeNull();
  });
});
