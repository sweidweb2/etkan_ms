import { describe, expect, it } from "vitest";
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_FEATURES,
  PERMISSION_KEYS,
  PERMISSION_KEY_PATTERN,
  PERMISSIONS,
  getPermissionKeysByFeature,
  isPermissionKey,
} from "@/lib/constants/permissions";

describe("permissions", () => {
  it("has unique keys across PERMISSIONS and definitions", () => {
    const fromConst = Object.values(PERMISSIONS);
    expect(new Set(fromConst).size).toBe(fromConst.length);
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);

    const fromDefinitions = PERMISSION_DEFINITIONS.map((item) => item.key);
    expect(new Set(fromDefinitions).size).toBe(fromDefinitions.length);
  });

  it("keeps PERMISSIONS and PERMISSION_DEFINITIONS in sync", () => {
    const fromConst = new Set(Object.values(PERMISSIONS));
    const fromDefinitions = new Set(
      PERMISSION_DEFINITIONS.map((item) => item.key)
    );

    expect(fromConst).toEqual(fromDefinitions);
    expect(PERMISSION_DEFINITIONS).toHaveLength(Object.keys(PERMISSIONS).length);
  });

  it("matches the agreed {feature}.{action} or {feature}.{resource}.{action} key pattern", () => {
    for (const key of PERMISSION_KEYS) {
      expect(key).toMatch(PERMISSION_KEY_PATTERN);
    }
  });

  it("uses only known feature groups", () => {
    const featureSet = new Set<string>(PERMISSION_FEATURES);
    for (const definition of PERMISSION_DEFINITIONS) {
      expect(featureSet.has(definition.feature)).toBe(true);
      expect(definition.key.startsWith(`${definition.feature}.`)).toBe(true);
    }
  });

  it("exposes every feature group with at least one permission", () => {
    for (const feature of PERMISSION_FEATURES) {
      expect(getPermissionKeysByFeature(feature).length).toBeGreaterThan(0);
    }
  });

  it("type-guards permission keys", () => {
    expect(isPermissionKey("subjects.view")).toBe(true);
    expect(isPermissionKey("subjects.delete")).toBe(true);
    expect(isPermissionKey("accounting.payment_phases.create")).toBe(true);
    expect(isPermissionKey("not.a.real.key")).toBe(false);
    expect(isPermissionKey("subjects")).toBe(false);
  });

  it("keeps the catalog size at 180 keys", () => {
    expect(PERMISSION_KEYS).toHaveLength(180);
    expect(isPermissionKey(PERMISSIONS.CLASSES_SET_TEAM_LEADER)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.TEAM_LEADER_ATTENDANCE_UPDATE)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.TEAM_LEADER_TASKS_START)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.STUDENTS_VIEW_OWN)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.SESSIONS_SKIP)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.CLASSES_DROP_SEMESTER)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.ACCOUNTING_DROP_REFUNDS_PROCESS)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.BACKUP_DOWNLOAD)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.BACKUP_EXPORT_STORAGE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.BACKUP_EXPORT_AUTH)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.BACKUP_EXPORT_AUTH_SETTINGS)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.RBAC_MANAGE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW)).toBe(
      true
    );
    expect(
      isPermissionKey(PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_ANALYTICS_VIEW)
    ).toBe(true);
    expect(isPermissionKey(PERMISSIONS.ACCOUNTING_TRANSACTIONS_CREATE)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.INSTRUCTORS_VIEW)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.INSTRUCTORS_CREATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.INSTRUCTORS_DELETE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW)).toBe(true);
    expect(
      isPermissionKey(PERMISSIONS.INSTRUCTOR_SCHEDULES_DETAILS_VIEW)
    ).toBe(true);
    expect(isPermissionKey(PERMISSIONS.WORKSHOPS_VIEW)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.WORKSHOPS_CHANGE_STATUS)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.WORKSHOPS_SESSIONS_CREATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.WORKSHOPS_DOCUMENTS_CREATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.WORKSHOPS_INSTRUCTORS_CREATE)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GALLERY_VIEW)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GALLERY_CREATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GALLERY_UPDATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GALLERY_DELETE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.PROJECTS_VIEW)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GUESTS_VIEW)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GUESTS_CREATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GUESTS_UPDATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GUESTS_DELETE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GUESTS_CHANGE_STATUS)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GUESTS_REGISTRATION_MANAGE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.GUESTS_CREATE_STUDENT)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.PROJECTS_CREATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.PROJECTS_UPDATE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.PROJECTS_DELETE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.REGISTRATIONS_VIEW)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.REGISTRATIONS_UPDATE_STATUS)).toBe(
      true
    );
  });
});