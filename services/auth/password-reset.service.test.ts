import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as authorizationService from "@/services/auth/authorization.service";
import {
  listPasswordResetUserOptions,
  loadPasswordResetUsersDeferredForManager,
  resetPasswordsByRoleForManager,
  resetUserPasswordForManager,
} from "@/services/auth/password-reset.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));
vi.mock("@/lib/utils/generate-strong-password", () => {
  let n = 0;
  return {
    generateStrongPassword: vi.fn(() => {
      n += 1;
      return `StrongPass${n}!`;
    }),
  };
});
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
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

const teacherId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";
const adminId = "44444444-4444-4444-8444-444444444444";

const teacherProfile = {
  id: teacherId,
  full_name: "Zoe Teacher",
  role: ROLES.TEACHER,
  is_instructor: false,
  created_at: "2026-01-01T00:00:00.000Z",
};

const studentProfile = {
  id: studentId,
  full_name: "Amy Student",
  role: ROLES.STUDENT,
  is_instructor: false,
  created_at: "2026-01-02T00:00:00.000Z",
};

const adminProfile = {
  id: adminId,
  full_name: "Bob Admin",
  role: ROLES.ADMIN,
  is_instructor: false,
  created_at: "2026-01-03T00:00:00.000Z",
};

describe("password-reset.service authz", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockImplementation(
      async (_c, userId) => (userId ? null : "Unauthorized.")
    );
  });

  it("denies listPasswordResetUserOptions and asserts SETTINGS_RESET_PASSWORDS", async () => {
    await expect(
      listPasswordResetUserOptions(adminClient, null)
    ).rejects.toThrow("Unauthorized.");

    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.SETTINGS_RESET_PASSWORDS
    );
  });

  it("returns empty list from deferred load when unauthorized", async () => {
    const rows = await loadPasswordResetUsersDeferredForManager(null);

    expect(rows).toEqual([]);
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.SETTINGS_RESET_PASSWORDS
    );
    expect(profileRepository.listProfiles).not.toHaveBeenCalled();
  });

  it("denies resetPasswordsByRoleForManager without actor", async () => {
    const result = await resetPasswordsByRoleForManager(
      adminClient,
      null,
      actor,
      { role: ROLES.TEACHER }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.SETTINGS_RESET_PASSWORDS
    );
  });

  it("denies resetUserPasswordForManager without actor", async () => {
    const result = await resetUserPasswordForManager(
      adminClient,
      null,
      actor,
      { userId: teacherId, password: "newpass1" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.SETTINGS_RESET_PASSWORDS
    );
  });
});

describe("listPasswordResetUserOptions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(null);
  });

  it("merges emails and sorts by full_name", async () => {
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [teacherProfile, studentProfile, adminProfile],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([
        [teacherId, "zoe@school.com"],
        [studentId, "amy@school.com"],
        [adminId, "bob@school.com"],
      ]),
      error: null,
    });

    const rows = await listPasswordResetUserOptions(adminClient, actor.userId);

    expect(rows.map((row) => row.full_name)).toEqual([
      "Amy Student",
      "Bob Admin",
      "Zoe Teacher",
    ]);
    expect(rows[0]).toMatchObject({
      id: studentId,
      email: "amy@school.com",
      role: ROLES.STUDENT,
    });
    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      actor.userId,
      PERMISSIONS.SETTINGS_RESET_PASSWORDS
    );
  });
});

describe("resetPasswordsByRoleForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(null);
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("resets passwords for a role cohort and audits", async () => {
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [teacherProfile, { ...teacherProfile, id: studentId, full_name: "Ann Teacher" }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([
        [teacherId, "zoe@school.com"],
        [studentId, "ann@school.com"],
      ]),
      error: null,
    });
    vi.mocked(authRepository.updateAuthUserPasswordByAdmin).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await resetPasswordsByRoleForManager(
      adminClient,
      actor.userId,
      actor,
      { role: ROLES.TEACHER }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toHaveLength(2);
      expect(result.message).toMatch(/Reset 2 teacher password/i);
      expect(result.rows[0]?.password).toBeTruthy();
    }
    expect(authRepository.updateAuthUserPasswordByAdmin).toHaveBeenCalledTimes(
      2
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        metadata: expect.objectContaining({
          role: ROLES.TEACHER,
          passwords_reset_count: 2,
          passwords_reset_failed_count: 0,
        }),
      })
    );
  });

  it("reports partial failure when some password updates fail", async () => {
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [teacherProfile, { ...teacherProfile, id: studentId, full_name: "Ann Teacher" }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([
        [teacherId, "zoe@school.com"],
        [studentId, "ann@school.com"],
      ]),
      error: null,
    });
    vi.mocked(authRepository.updateAuthUserPasswordByAdmin)
      .mockResolvedValueOnce({ data: null, error: null } as never)
      .mockResolvedValueOnce({
        data: null,
        error: { message: "update failed" },
      } as never);

    const result = await resetPasswordsByRoleForManager(
      adminClient,
      actor.userId,
      actor,
      { role: ROLES.TEACHER }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toHaveLength(1);
      expect(result.message).toMatch(/Reset 1 of 2 teacher password/i);
    }
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        metadata: expect.objectContaining({
          passwords_reset_count: 1,
          passwords_reset_failed_count: 1,
        }),
      })
    );
  });

  it("rejects an empty cohort", async () => {
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await resetPasswordsByRoleForManager(
      adminClient,
      actor.userId,
      actor,
      { role: ROLES.TEACHER }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/No users found/i);
    }
    expect(
      authRepository.updateAuthUserPasswordByAdmin
    ).not.toHaveBeenCalled();
  });

  it("returns fieldErrors for an invalid role", async () => {
    const result = await resetPasswordsByRoleForManager(
      adminClient,
      actor.userId,
      actor,
      { role: "not-a-role" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.role).toBeDefined();
    }
  });
});

describe("resetUserPasswordForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(null);
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("resets a single user password and audits", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: teacherProfile,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(authRepository.updateAuthUserPasswordByAdmin).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await resetUserPasswordForManager(
      adminClient,
      actor.userId,
      actor,
      { userId: teacherId, password: "newpass1" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toMatch(/Zoe Teacher/i);
    }
    expect(authRepository.updateAuthUserPasswordByAdmin).toHaveBeenCalledWith(
      adminClient,
      teacherId,
      "newpass1"
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalled();
  });

  it("returns User not found when profile is missing", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await resetUserPasswordForManager(
      adminClient,
      actor.userId,
      actor,
      { userId: teacherId, password: "newpass1" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User not found.");
    }
    expect(
      authRepository.updateAuthUserPasswordByAdmin
    ).not.toHaveBeenCalled();
  });

  it("returns fieldErrors for a short password", async () => {
    const result = await resetUserPasswordForManager(
      adminClient,
      actor.userId,
      actor,
      { userId: teacherId, password: "ab" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.password).toBeDefined();
    }
    expect(profileRepository.findProfileById).not.toHaveBeenCalled();
  });
});
