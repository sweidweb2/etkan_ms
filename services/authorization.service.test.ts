import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  UNAUTHORIZED_MESSAGE,
  getUserPermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasPermissionInSet,
  requirePermission,
  requirePermissionInSet,
} from "@/services/authorization.service";

vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/permission.repository");

const client = {} as never;
const managerId = "11111111-1111-4111-8111-111111111111";
const teacherId = "22222222-2222-4222-8222-222222222222";
const missingId = "33333333-3333-4333-8333-333333333333";

const managerKeys = [
  { permission_key: PERMISSIONS.SUBJECTS_VIEW },
  { permission_key: PERMISSIONS.SUBJECTS_CREATE },
  { permission_key: PERMISSIONS.SUBJECTS_DELETE },
];

describe("authorization.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("allows a manager user for granted sample permissions", async () => {
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

    expect(await hasPermission(client, managerId, "not.a.real.key")).toBe(false);
    await expect(
      requirePermission(client, managerId, "not.a.real.key")
    ).rejects.toThrow(UNAUTHORIZED_MESSAGE);
  });

  it("denies missing user / missing profile", async () => {
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
      requirePermission(client, missingId, PERMISSIONS.USERS_VIEW)
    ).rejects.toThrow(UNAUTHORIZED_MESSAGE);
  });

  it("supports hasAnyPermission and hasAllPermissions", async () => {
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
