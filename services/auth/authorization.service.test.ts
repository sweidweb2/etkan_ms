import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  UNAUTHORIZED_MESSAGE,
  assertPermission,
  assertPermissions,
  getUserPermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasPermissionInSet,
  requirePermission,
  requirePermissionInSet,
} from "@/services/auth/authorization.service";

vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/permission.repository");
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({}),
}));

const client = {} as never;

const managerKeys = [
  { permission_key: PERMISSIONS.SUBJECTS_VIEW },
  { permission_key: PERMISSIONS.SUBJECTS_CREATE },
  { permission_key: PERMISSIONS.SUBJECTS_DELETE },
];

function mockManagerGrants() {
  vi.mocked(profileRepository.findRoleById).mockResolvedValue({
    data: { role: ROLES.MANAGER },
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  });
  vi.mocked(permissionRepository.listPermissionKeysByRole).mockResolvedValue({
    data: managerKeys,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  });
}

describe("authorization.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("allows a manager user for granted sample permissions", async () => {
    const managerId = "11111111-1111-4111-8111-111111111101";
    mockManagerGrants();

    const permissions = await getUserPermissions(client, managerId);

    expect(permissions.has(PERMISSIONS.SUBJECTS_VIEW)).toBe(true);
    expect(await hasPermission(client, managerId, PERMISSIONS.SUBJECTS_VIEW)).toBe(
      true
    );
    await expect(
      requirePermission(client, managerId, PERMISSIONS.SUBJECTS_DELETE)
    ).resolves.toBeUndefined();
  });

  it("denies teacher/student roles with no grants", async () => {
    const teacherId = "22222222-2222-4222-8222-222222222201";
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.TEACHER },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.listPermissionKeysByRole).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    expect(await hasPermission(client, teacherId, PERMISSIONS.SUBJECTS_VIEW)).toBe(
      false
    );
    await expect(
      requirePermission(client, teacherId, PERMISSIONS.SUBJECTS_VIEW)
    ).rejects.toThrow(UNAUTHORIZED_MESSAGE);
  });

  it("denies unknown permission keys by default", async () => {
    const managerId = "11111111-1111-4111-8111-111111111102";
    mockManagerGrants();

    expect(await hasPermission(client, managerId, "not.a.real.key")).toBe(false);
    await expect(
      requirePermission(client, managerId, "not.a.real.key")
    ).rejects.toThrow(UNAUTHORIZED_MESSAGE);
  });

  it("denies missing user / missing profile", async () => {
    const missingId = "33333333-3333-4333-8333-333333333301";
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const permissions = await getUserPermissions(client, missingId);

    expect(permissions.size).toBe(0);
    expect(
      await hasPermission(client, missingId, PERMISSIONS.SUBJECTS_VIEW)
    ).toBe(false);
    expect(permissionRepository.listPermissionKeysByRole).not.toHaveBeenCalled();
  });

  it("requirePermission fails with a clear unauthorized outcome", async () => {
    const studentId = "33333333-3333-4333-8333-333333333302";
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.STUDENT },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.listPermissionKeysByRole).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    await expect(
      requirePermission(client, studentId, PERMISSIONS.USERS_VIEW)
    ).rejects.toThrow(UNAUTHORIZED_MESSAGE);
  });

  it("supports hasAnyPermission and hasAllPermissions", async () => {
    const managerId = "11111111-1111-4111-8111-111111111103";
    mockManagerGrants();

    expect(
      await hasAnyPermission(client, managerId, [
        PERMISSIONS.SUBJECTS_UPDATE,
        PERMISSIONS.SUBJECTS_VIEW,
      ])
    ).toBe(true);

    expect(
      await hasAllPermissions(client, managerId, [
        PERMISSIONS.SUBJECTS_VIEW,
        PERMISSIONS.SUBJECTS_CREATE,
      ])
    ).toBe(true);

    expect(
      await hasAllPermissions(client, managerId, [
        PERMISSIONS.SUBJECTS_VIEW,
        PERMISSIONS.SUBJECTS_UPDATE,
      ])
    ).toBe(false);
  });

  it("assertPermission allows granted keys for the session actor", async () => {
    const managerId = "11111111-1111-4111-8111-111111111104";
    mockManagerGrants();

    await expect(
      assertPermission(client, managerId, PERMISSIONS.SUBJECTS_VIEW)
    ).resolves.toBeUndefined();
    await expect(
      assertPermission(client, managerId, PERMISSIONS.SUBJECTS_CREATE)
    ).resolves.toBeUndefined();
  });

  it("assertPermissions allows all granted keys in one check", async () => {
    const managerId = "11111111-1111-4111-8111-111111111105";
    mockManagerGrants();

    await expect(
      assertPermissions(client, managerId, [
        PERMISSIONS.SUBJECTS_VIEW,
        PERMISSIONS.SUBJECTS_CREATE,
      ])
    ).resolves.toBeUndefined();

    await expect(
      assertPermissions(client, managerId, [
        PERMISSIONS.SUBJECTS_VIEW,
        PERMISSIONS.SUBJECTS_UPDATE,
      ])
    ).rejects.toThrow(UNAUTHORIZED_MESSAGE);
  });

  it("set helpers mirror async checks without extra DB calls", () => {
    const permissions = new Set([
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.SUBJECTS_CREATE,
    ]);

    expect(hasPermissionInSet(permissions, PERMISSIONS.SUBJECTS_VIEW)).toBe(true);
    expect(hasPermissionInSet(permissions, "not.a.real.key")).toBe(false);
    expect(() =>
      requirePermissionInSet(permissions, PERMISSIONS.SUBJECTS_DELETE)
    ).toThrow(UNAUTHORIZED_MESSAGE);
  });
});
