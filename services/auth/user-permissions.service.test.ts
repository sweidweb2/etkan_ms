import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import {
  clearUserOverlayAfterRoleChange,
  getUserAccessBreakdown,
  replaceUserPermissionsForManager,
} from "@/services/auth/user-permissions.service";

vi.mock("@/repositories/permission.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/lib/auth/session-shell-cache", () => ({
  clearCachedSessionShell: vi.fn(),
}));
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "manager-1",
  userLabel: "Manager One",
};

function mockActorIsManager() {
  vi.mocked(profileRepository.findRoleById).mockResolvedValue({
    data: { role: ROLES.MANAGER },
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  });
}

describe("getUserAccessBreakdown", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockActorIsManager();
  });

  it("returns role keys and private allow keys (ignores role-covered)", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "co",
        role: ROLES.CO_MANAGER,
        is_instructor: false,
        is_mentor: false,
        created_at: "2026-01-01",
      } as never,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.listPermissionKeysByRole).mockResolvedValue({
      data: [{ permission_key: PERMISSIONS.SUBJECTS_VIEW }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.listUserPermissionRows).mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.SUBJECTS_CREATE,
          granted_by: "manager-1",
          created_at: "2026-09-14T00:00:00.000Z",
        },
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.SUBJECTS_VIEW,
          granted_by: "manager-1",
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await getUserAccessBreakdown(
      adminClient,
      actor.userId,
      "user-1"
    );

    expect(result).toMatchObject({
      userId: "user-1",
      role: ROLES.CO_MANAGER,
      roleKeys: [PERMISSIONS.SUBJECTS_VIEW],
      allowKeys: [PERMISSIONS.SUBJECTS_CREATE],
    });
  });
});

describe("replaceUserPermissionsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockActorIsManager();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("strips role-covered keys, replaces, audits, clears shell", async () => {
    const { clearCachedSessionShell } = await import(
      "@/lib/auth/session-shell-cache"
    );

    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "co",
        role: ROLES.CO_MANAGER,
        is_instructor: false,
        is_mentor: false,
        created_at: "2026-01-01",
      } as never,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.listPermissionKeysByRole).mockResolvedValue({
      data: [{ permission_key: PERMISSIONS.SUBJECTS_VIEW }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.listUserPermissionRows).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.replaceUserPermissions).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await replaceUserPermissionsForManager(
      adminClient,
      actor.userId,
      actor,
      "user-1",
      [PERMISSIONS.SUBJECTS_VIEW, PERMISSIONS.SUBJECTS_CREATE]
    );

    expect(result.success).toBe(true);
    expect(permissionRepository.replaceUserPermissions).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      [
        {
          permission_key: PERMISSIONS.SUBJECTS_CREATE,
          granted_by: actor.userId,
        },
      ]
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
    expect(clearCachedSessionShell).toHaveBeenCalledWith("user-1");
  });
});

describe("clearUserOverlayAfterRoleChange", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clears private allows when the role changes", async () => {
    vi.mocked(permissionRepository.listUserPermissionRows).mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.SUBJECTS_CREATE,
          granted_by: null,
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.deleteUserPermissions).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await clearUserOverlayAfterRoleChange(adminClient, actor, {
      userId: "user-1",
      previousRole: ROLES.TEACHER,
      newRole: ROLES.STUDENT,
    });

    expect(result).toEqual({ success: true });
    expect(permissionRepository.deleteUserPermissions).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
  });
});
