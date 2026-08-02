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

  it("keeps the catalog size at 101 keys (includes instructors)", () => {
    expect(PERMISSION_KEYS).toHaveLength(101);
    expect(isPermissionKey(PERMISSIONS.RBAC_MANAGE)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.ACCOUNTING_TRANSACTIONS_CREATE)).toBe(
      true
    );
    expect(isPermissionKey(PERMISSIONS.INSTRUCTORS_VIEW)).toBe(true);
    expect(isPermissionKey(PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE)).toBe(
      true
    );
  });
});