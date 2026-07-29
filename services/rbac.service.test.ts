import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import type { AuditActor } from "@/services/audit-log.service";
import * as auditLogService from "@/services/audit-log.service";
import {
  updateRolePermissionsForManager,
  wouldRetainRbacManage,
  type RolePermissionsMap,
} from "@/services/rbac.service";

vi.mock("@/repositories/permission.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

function mapWith(
  overrides: Partial<RolePermissionsMap>
): RolePermissionsMap {
  return {
    [ROLES.ADMIN]: [],
    [ROLES.MANAGER]: [PERMISSIONS.RBAC_MANAGE],
    [ROLES.CO_MANAGER]: [],
    [ROLES.CEO]: [],
    [ROLES.TEACHER]: [],
    [ROLES.TRAINER]: [],
    [ROLES.STUDENT]: [],
    ...overrides,
  };
}

describe("wouldRetainRbacManage", () => {
  it("rejects clearing rbac.manage from the sole holder", () => {
    expect(
      wouldRetainRbacManage(mapWith({}), ROLES.MANAGER, [
        PERMISSIONS.SUBJECTS_VIEW,
      ])
    ).toBe(false);
  });

  it("allows clearing when another role already has rbac.manage", () => {
    expect(
      wouldRetainRbacManage(
        mapWith({
          [ROLES.MANAGER]: [PERMISSIONS.RBAC_MANAGE],
          [ROLES.ADMIN]: [PERMISSIONS.RBAC_MANAGE],
        }),
        ROLES.MANAGER,
        [PERMISSIONS.SUBJECTS_VIEW]
      )
    ).toBe(true);
  });

  it("allows keeping rbac.manage on the edited role", () => {
    expect(
      wouldRetainRbacManage(mapWith({}), ROLES.MANAGER, [
        PERMISSIONS.RBAC_MANAGE,
        PERMISSIONS.SUBJECTS_VIEW,
      ])
    ).toBe(true);
  });
});

describe("updateRolePermissionsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects unauthorized actors", async () => {
    const result = await updateRolePermissionsForManager(
      adminClient,
      null,
      actor,
      { role: ROLES.TEACHER, permissionKeys: [] }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects lockout saves", async () => {
    vi.mocked(permissionRepository.listRolePermissions).mockResolvedValue({
      data: [
        {
          role: ROLES.MANAGER,
          permission_key: PERMISSIONS.RBAC_MANAGE,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateRolePermissionsForManager(
      adminClient,
      actor.userId,
      actor,
      {
        role: ROLES.MANAGER,
        permissionKeys: [PERMISSIONS.SUBJECTS_VIEW],
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/rbac\.manage/);
    }
    expect(permissionRepository.replaceRolePermissions).not.toHaveBeenCalled();
  });

  it("replaces grants and records an audit log", async () => {
    vi.mocked(permissionRepository.listRolePermissions).mockResolvedValue({
      data: [
        {
          role: ROLES.MANAGER,
          permission_key: PERMISSIONS.RBAC_MANAGE,
        },
        {
          role: ROLES.MANAGER,
          permission_key: PERMISSIONS.SUBJECTS_VIEW,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.replaceRolePermissions).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const nextKeys = [
      PERMISSIONS.RBAC_MANAGE,
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.SUBJECTS_CREATE,
    ];

    const result = await updateRolePermissionsForManager(
      adminClient,
      actor.userId,
      actor,
      { role: ROLES.MANAGER, permissionKeys: nextKeys }
    );

    expect(result).toEqual({
      success: true,
      message: "Permissions updated for manager.",
      keys: [...nextKeys].sort(),
    });
    expect(permissionRepository.replaceRolePermissions).toHaveBeenCalledWith(
      adminClient,
      ROLES.MANAGER,
      [...nextKeys].sort()
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });
});
