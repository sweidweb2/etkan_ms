import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import {
  KEEP_PRIVATE_PERMISSIONS_REQUIRED_MESSAGE,
  classifyOverlayForRoleChange,
  getUserAccessBreakdown,
  planOverlayAfterRoleChange,
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

describe("classifyOverlayForRoleChange", () => {
  it("asks about allows not on the new role and denies that hit the new role", () => {
    const { toAsk, toPrune } = classifyOverlayForRoleChange(
      [
        { permission_key: PERMISSIONS.SUBJECTS_VIEW, effect: "allow" },
        { permission_key: PERMISSIONS.SUBJECTS_CREATE, effect: "allow" },
        { permission_key: PERMISSIONS.SUBJECTS_DELETE, effect: "deny" },
        { permission_key: PERMISSIONS.USERS_VIEW, effect: "deny" },
      ],
      new Set([PERMISSIONS.SUBJECTS_VIEW, PERMISSIONS.SUBJECTS_DELETE])
    );

    expect(toAsk).toEqual([
      { permission_key: PERMISSIONS.SUBJECTS_CREATE, effect: "allow" },
      { permission_key: PERMISSIONS.SUBJECTS_DELETE, effect: "deny" },
    ]);
    expect(toPrune).toEqual([
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.USERS_VIEW,
    ]);
  });
});

describe("getUserAccessBreakdown", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockActorIsManager();
  });

  it("rejects non-manager actors", async () => {
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.CO_MANAGER },
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

    expect(result).toEqual({
      error: "Only managers can manage user permission overlays.",
    });
  });

  it("returns role, overlay, and effective keys", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "co",
        role: ROLES.CO_MANAGER,
        is_instructor: false,
        is_mentor: false,
        created_at: "2026-01-01",
      },
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
          effect: "allow",
          granted_by: "manager-1",
          created_at: "2026-09-14T00:00:00.000Z",
        },
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.SUBJECTS_VIEW,
          effect: "deny",
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

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.role).toBe(ROLES.CO_MANAGER);
    expect(result.roleKeys).toEqual([PERMISSIONS.SUBJECTS_VIEW]);
    expect(result.effectiveKeys).toEqual([PERMISSIONS.SUBJECTS_CREATE]);
  });
});

describe("replaceUserPermissionsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockActorIsManager();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("replaces overlay, audits, and clears the user shell", async () => {
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
      },
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
    vi.mocked(permissionRepository.listPermissionKeysByRole).mockResolvedValue({
      data: [{ permission_key: PERMISSIONS.RBAC_MANAGE }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [
        {
          id: "manager-1",
          username: "mgr",
          role: ROLES.MANAGER,
          is_instructor: false,
          is_mentor: false,
          created_at: "2026-01-01",
        },
      ],
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
      [{ permission_key: PERMISSIONS.SUBJECTS_VIEW, effect: "allow" }]
    );

    expect(result.success).toBe(true);
    expect(permissionRepository.replaceUserPermissions).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      [
        {
          permission_key: PERMISSIONS.SUBJECTS_VIEW,
          effect: "allow",
          granted_by: actor.userId,
        },
      ]
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
    expect(clearCachedSessionShell).toHaveBeenCalledWith("user-1");
  });

  it("blocks deny that would leave no manager with effective rbac.manage", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "manager-1",
        username: "mgr",
        role: ROLES.MANAGER,
        is_instructor: false,
        is_mentor: false,
        created_at: "2026-01-01",
      },
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
    vi.mocked(permissionRepository.listPermissionKeysByRole).mockResolvedValue({
      data: [{ permission_key: PERMISSIONS.RBAC_MANAGE }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [
        {
          id: "manager-1",
          username: "mgr",
          role: ROLES.MANAGER,
          is_instructor: false,
          is_mentor: false,
          created_at: "2026-01-01",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await replaceUserPermissionsForManager(
      adminClient,
      actor.userId,
      actor,
      "manager-1",
      [{ permission_key: PERMISSIONS.RBAC_MANAGE, effect: "deny" }]
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/rbac\.manage/);
    }
    expect(permissionRepository.replaceUserPermissions).not.toHaveBeenCalled();
  });
});

describe("planOverlayAfterRoleChange", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requires keepPrivatePermissions when private rows remain", async () => {
    vi.mocked(permissionRepository.listUserPermissionRows).mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.SUBJECTS_CREATE,
          effect: "allow",
          granted_by: null,
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
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

    const result = await planOverlayAfterRoleChange(adminClient, {
      userId: "user-1",
      previousRole: ROLES.TEACHER,
      newRole: ROLES.STUDENT,
    });

    expect(result).toEqual({
      success: false,
      error: KEEP_PRIVATE_PERMISSIONS_REQUIRED_MESSAGE,
      requiresKeepPrivateDecision: true,
    });
  });

  it("auto-plans prune when only redundant allows exist", async () => {
    vi.mocked(permissionRepository.listUserPermissionRows).mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.SUBJECTS_VIEW,
          effect: "allow",
          granted_by: null,
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
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

    const result = await planOverlayAfterRoleChange(adminClient, {
      userId: "user-1",
      previousRole: ROLES.TEACHER,
      newRole: ROLES.CO_MANAGER,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.nextRows).toEqual([]);
    expect(result.prunedKeys).toEqual([PERMISSIONS.SUBJECTS_VIEW]);
  });
});
