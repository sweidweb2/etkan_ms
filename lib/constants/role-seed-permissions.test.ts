import { describe, expect, it } from "vitest";
import {
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import {
  CEO_WORKSHOP_SEED_PERMISSIONS,
  CRM_SEED_PERMISSIONS,
  ROLE_SEED_PERMISSIONS,
  SUPERVISOR_EXCLUDED_PERMISSION_FEATURES,
  SUPERVISOR_SEED_PERMISSIONS,
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
] as const;

const SUPERVISOR_EXCLUDED_FEATURE_SET = new Set(
  SUPERVISOR_EXCLUDED_PERMISSION_FEATURES
);

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
  it("seeds guests, teams, and registrations.view only", () => {
    expect(CRM_SEED_PERMISSIONS).toHaveLength(13);
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
  it("excludes every key from excluded feature groups", () => {
    const excludedKeys = PERMISSION_DEFINITIONS.filter((definition) =>
      SUPERVISOR_EXCLUDED_FEATURE_SET.has(definition.feature)
    ).map((definition) => definition.key);

    expect(excludedKeys.length).toBeGreaterThan(0);

    for (const key of excludedKeys) {
      expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(key);
    }
  });

  it("grants remaining catalog keys including operational views", () => {
    const expected = PERMISSION_DEFINITIONS.filter(
      (definition) => !SUPERVISOR_EXCLUDED_FEATURE_SET.has(definition.feature)
    ).map((definition) => definition.key);

    expect(SUPERVISOR_SEED_PERMISSIONS).toEqual(expected);
    expect(ROLE_SEED_PERMISSIONS[ROLES.SUPERVISOR]).toEqual(
      SUPERVISOR_SEED_PERMISSIONS
    );

    const required: PermissionKey[] = [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.STUDENTS_VIEW,
      PERMISSIONS.CLASSES_VIEW,
      PERMISSIONS.WORKSHOPS_VIEW,
      PERMISSIONS.GUESTS_VIEW,
      PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW,
    ];
    for (const key of required) {
      expect(SUPERVISOR_SEED_PERMISSIONS).toContain(key);
    }

    expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(PERMISSIONS.USERS_VIEW);
    expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(
      PERMISSIONS.ACCOUNTING_VIEW
    );
    expect(SUPERVISOR_SEED_PERMISSIONS).not.toContain(
      PERMISSIONS.RBAC_MANAGE
    );
  });
});
