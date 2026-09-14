import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import { syncWorkshopAttributeAccessOverlay } from "@/services/auth/workshop-attribute-access.service";

vi.mock("@/repositories/permission.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/lib/auth/session-shell-cache", () => ({
  clearCachedSessionShell: vi.fn(),
}));
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "manager-1",
  userLabel: "Manager One",
};

describe("syncWorkshopAttributeAccessOverlay", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("grants readonly workshop overlay when gaining instructor/mentor", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "crm",
        role: ROLES.CRM,
        is_instructor: true,
        is_mentor: false,
        created_at: "2026-01-01",
      },
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

    const result = await syncWorkshopAttributeAccessOverlay(adminClient, actor, {
      userId: "user-1",
      previousIsInstructor: false,
      previousIsMentor: false,
      nextIsInstructor: true,
      nextIsMentor: false,
    });

    expect(result).toEqual({ success: true });
    expect(permissionRepository.replaceUserPermissions).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      [
        {
          permission_key: PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
          granted_by: actor.userId,
        },
        {
          permission_key: PERMISSIONS.WORKSHOPS_VIEW,
          granted_by: actor.userId,
        },
      ]
    );
  });

  it("revokes attribute overlay when both flags clear", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "crm",
        role: ROLES.CRM,
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
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(permissionRepository.listUserPermissionRows).mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.WORKSHOPS_VIEW,
          granted_by: null,
          created_at: "2026-01-01",
        },
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
          granted_by: null,
          created_at: "2026-01-01",
        },
        {
          user_id: "user-1",
          permission_key: PERMISSIONS.GUESTS_VIEW,
          granted_by: null,
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

    const result = await syncWorkshopAttributeAccessOverlay(adminClient, actor, {
      userId: "user-1",
      previousIsInstructor: false,
      previousIsMentor: true,
      nextIsInstructor: false,
      nextIsMentor: false,
    });

    expect(result).toEqual({ success: true });
    expect(permissionRepository.replaceUserPermissions).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      [
        {
          permission_key: PERMISSIONS.GUESTS_VIEW,
          granted_by: actor.userId,
        },
      ]
    );
  });

  it("keeps overlay when one attribute remains", async () => {
    const result = await syncWorkshopAttributeAccessOverlay(adminClient, actor, {
      userId: "user-1",
      previousIsInstructor: true,
      previousIsMentor: true,
      nextIsInstructor: false,
      nextIsMentor: true,
    });

    expect(result).toEqual({ success: true });
    expect(permissionRepository.replaceUserPermissions).not.toHaveBeenCalled();
  });
});
