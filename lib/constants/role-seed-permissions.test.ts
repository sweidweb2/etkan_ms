import { describe, expect, it } from "vitest";
import {
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import {
  CEO_WORKSHOP_SEED_PERMISSIONS,
  CLASS_TREE_SEED_PERMISSIONS,
  CRM_SEED_PERMISSIONS,
  ROLE_SEED_PERMISSIONS,
  STUDENT_SEED_PERMISSIONS,
  SUPERVISOR_SEED_FEATURES,
  SUPERVISOR_SEED_PERMISSIONS,
  TEACHER_SEED_PERMISSIONS,
} from "@/lib/constants/role-seed-permissions";
import { ROLES } from "@/lib/constants/roles";

const CEO_GUEST_PERMISSIONS = [
  PERMISSIONS.GUESTS_VIEW,
  PERMISSIONS.GUESTS_CREATE,
  PERMISSIONS.GUESTS_UPDATE,
  PERMISSIONS.GUESTS_DELETE,
  PERMISSIONS.GUESTS_CHANGE_STATUS,
  PERMISSIONS.GUESTS_REGISTRATION_MANAGE,
  PERMISSIONS.GUESTS_CREATE_STUDENT,
] as const;

const CRM_EXPECTED_PERMISSIONS = [
  ...CEO_GUEST_PERMISSIONS,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.TEAMS_CREATE,
  PERMISSIONS.TEAMS_UPDATE,
  PERMISSIONS.TEAMS_DELETE,
  PERMISSIONS.TEAMS_ASSIGN_GUEST,
  PERMISSIONS.REGISTRATIONS_VIEW,
  PERMISSIONS.REGISTRATIONS_UPDATE_STATUS,
] as const;

const SUPERVISOR_FEATURE_SET = new Set(SUPERVISOR_SEED_FEATURES);

describe("role-seed-permissions guests", () => {
  it("seeds all guests.* permissions to CEO", () => {
    for (const key of CEO_GUEST_PERMISSIONS) {
      expect(CEO_WORKSHOP_SEED_PERMISSIONS).toContain(key);
    }

    const ceoSeed = ROLE_SEED_PERMISSIONS[ROLES.CEO];
    for (const key of CEO_GUEST_PERMISSIONS) {
      expect(ceoSeed).toContain(key);
    }
    expect(ceoSeed).toContain(PERMISSIONS.REGISTRATIONS_VIEW);
  });

  it("seeds academic analysis view to CEO", () => {
    expect(CEO_WORKSHOP_SEED_PERMISSIONS).toContain(
      PERMISSIONS.ACADEMIC_ANALYSIS_VIEW
    );
    expect(ROLE_SEED_PERMISSIONS[ROLES.CEO]).toContain(
      PERMISSIONS.ACADEMIC_ANALYSIS_VIEW
    );
  });
});

describe("role-seed-permissions crm", () => {
  it("seeds guests, teams, and full registrations", () => {
    expect(CRM_SEED_PERMISSIONS).toHaveLength(14);
    expect([...CRM_SEED_PERMISSIONS].sort()).toEqual(
      [...CRM_EXPECTED_PERMISSIONS].sort()
    );
    expect(ROLE_SEED_PERMISSIONS[ROLES.CRM]).toEqual(CRM_SEED_PERMISSIONS);
    expect(CRM_SEED_PERMISSIONS).not.toContain(PERMISSIONS.WORKSHOPS_VIEW);
    expect(CRM_SEED_PERMISSIONS).not.toContain(PERMISSIONS.STUDENTS_VIEW);
    expect(CRM_SEED_PERMISSIONS).not.toContain(PERMISSIONS.USERS_VIEW);
  });
});

describe("role-seed-permissions supervisor", () => {
  it("grants only allow-listed feature groups", () => {
    const expected = PERMISSION_DEFINITIONS.filter((definition) =>
      SUPERVISOR_FEATURE_SET.has(definition.feature)
    ).map((definition) => definition.key);

    expect(SUPERVISOR_SEED_PERMISSIONS).toEqual(expected);
    expect(ROLE_SEED_PERMISSIONS[ROLES.SUPERVISOR]).toEqual(
      SUPERVISOR_SEED_PERMISSIONS
    );

    const required: PermissionKey[] = [
      PERMISSIONS.WORKSHOPS_VIEW,
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.SUBJECTS_CATEGORIES_VIEW,
      PERMISSIONS.SUBJECTS_EXERCISES_VIEW,
      PERMISSIONS.STUDENTS_VIEW,
      PERMISSIONS.CLASSES_VIEW,
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
      PERMISSIONS.ACADEMIC_ANALYSIS_VIEW,
    ];
    for (const key of required) {
      expect(SUPERVISOR_SEED_PERMISSIONS).toContain(key);
    }

    expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(PERMISSIONS.USERS_VIEW);
    expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(
      PERMISSIONS.ACCOUNTING_VIEW
    );
    expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(PERMISSIONS.GUESTS_VIEW);
    expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(
      PERMISSIONS.RBAC_MANAGE
    );
  });
});

describe("role-seed-permissions teacher", () => {
  it("seeds the full class tree only", () => {
    expect(TEACHER_SEED_PERMISSIONS).toEqual(CLASS_TREE_SEED_PERMISSIONS);
    expect(ROLE_SEED_PERMISSIONS[ROLES.TEACHER]).toEqual(
      TEACHER_SEED_PERMISSIONS
    );
    expect(TEACHER_SEED_PERMISSIONS).toContain(PERMISSIONS.CLASSES_VIEW);
    expect(TEACHER_SEED_PERMISSIONS).toContain(PERMISSIONS.SESSIONS_CREATE);
    expect(TEACHER_SEED_PERMISSIONS).toContain(PERMISSIONS.TASKS_UPDATE_STUDENT);
    expect(TEACHER_SEED_PERMISSIONS).toContain(PERMISSIONS.GRADES_COMPUTE);
    expect(TEACHER_SEED_PERMISSIONS).not.toContain(PERMISSIONS.WORKSHOPS_VIEW);
    expect(TEACHER_SEED_PERMISSIONS).not.toContain(PERMISSIONS.STUDENTS_VIEW);
  });
});

describe("role-seed-permissions co-manager", () => {
  it("seeds zero permissions", () => {
    expect(ROLE_SEED_PERMISSIONS[ROLES.CO_MANAGER]).toEqual([]);
  });
});

describe("role-seed-permissions student", () => {
  it("seeds own profile, class reads, and SPP accounting views", () => {
    expect(ROLE_SEED_PERMISSIONS[ROLES.STUDENT]).toEqual(
      STUDENT_SEED_PERMISSIONS
    );
    expect(STUDENT_SEED_PERMISSIONS).toContain(PERMISSIONS.STUDENTS_VIEW_OWN);
    expect(STUDENT_SEED_PERMISSIONS).toContain(PERMISSIONS.CLASSES_VIEW);
    expect(STUDENT_SEED_PERMISSIONS).toContain(PERMISSIONS.SESSIONS_VIEW);
    expect(STUDENT_SEED_PERMISSIONS).toContain(PERMISSIONS.TASKS_VIEW);
    expect(STUDENT_SEED_PERMISSIONS).toContain(PERMISSIONS.ACCOUNTING_VIEW);
    expect(STUDENT_SEED_PERMISSIONS).toContain(
      PERMISSIONS.PAYMENT_SCHEDULES_VIEW
    );
    expect(STUDENT_SEED_PERMISSIONS).not.toContain(PERMISSIONS.WORKSHOPS_VIEW);
    expect(STUDENT_SEED_PERMISSIONS).not.toContain(PERMISSIONS.CLASSES_CREATE);
  });
});
