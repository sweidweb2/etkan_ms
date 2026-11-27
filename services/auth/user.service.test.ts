import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { DEFAULT_CREATED_STUDENT_PASSWORD } from "@/lib/constants/auth-limits";
import { ROLES } from "@/lib/constants/roles";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import * as roleService from "@/services/auth/role.service";
import {
  createStaffUser,
  listEmailingRecipientsForBulkForManager,
  listEmailingRecipientsPageForManager,
  listUsersForManager,
  updateManagerUser,
} from "@/services/auth/user.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/lib/manager/instructors/clear-instructor-related", () => ({
  clearInstructorWorkshopRelatedData: vi.fn(),
}));
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/role.service");
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient,
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
vi.mock("@/lib/auth/session-shell-cache", () => ({
  clearCachedSessionShell: vi.fn(),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const authUser = {
  id: "user-1",
  email: "teacher@school.com",
  app_metadata: { role: ROLES.TEACHER },
  user_metadata: { full_name: "Teacher One" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

const validStaffInput = {
  fullName: "Teacher One",
  email: "teacher@school.com",
  password: "secret123",
  role: ROLES.TEACHER,
  is_instructor: false,
};

describe("listUsersForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listUsersForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns users with emails merged from auth", async () => {
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [
        {
          id: "user-1",
          full_name: "Teacher One",
          role: ROLES.TEACHER,
          is_instructor: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([["user-1", "teacher@school.com"]]),
      error: null,
    });

    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const users = await listUsersForManager(adminClient, actor.userId);

    expect(users).toEqual([
      {
        id: "user-1",
        full_name: "Teacher One",
        role: ROLES.TEACHER,
        is_instructor: false,
        created_at: "2026-01-01T00:00:00.000Z",
        email: "teacher@school.com",
      },
    ]);
  });
});

describe("listEmailingRecipientsPageForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is unauthorized", async () => {
    await expect(
      listEmailingRecipientsPageForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("pages all roles including students and hydrates emails for the page only", async () => {
    vi.mocked(profileRepository.listProfilesPage).mockResolvedValue({
      data: [
        {
          id: "student-1",
          full_name: "Student One",
          role: ROLES.STUDENT,
          is_instructor: false,
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "teacher-1",
          full_name: "Teacher One",
          role: ROLES.TEACHER,
          is_instructor: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: 2,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(profileRepository.countProfiles)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 2,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 1,
        status: 200,
        statusText: "OK",
      } as never);

    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([
        ["student-1", "student@school.com"],
        ["teacher-1", "teacher@school.com"],
      ]),
      error: null,
    });

    const result = await listEmailingRecipientsPageForManager(
      adminClient,
      actor.userId,
      { page: 1, pageSize: 10 }
    );

    expect(profileRepository.listProfilesPage).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        offset: 0,
        limit: 10,
        roles: undefined,
        search: "",
        ids: undefined,
      })
    );
    expect(authRepository.listAuthEmailsByIds).toHaveBeenCalledWith(
      adminClient,
      ["student-1", "teacher-1"]
    );
    expect(result).toEqual({
      users: [
        {
          id: "student-1",
          full_name: "Student One",
          role: ROLES.STUDENT,
          is_instructor: false,
          created_at: "2026-01-02T00:00:00.000Z",
          email: "student@school.com",
        },
        {
          id: "teacher-1",
          full_name: "Teacher One",
          role: ROLES.TEACHER,
          is_instructor: false,
          created_at: "2026-01-01T00:00:00.000Z",
          email: "teacher@school.com",
        },
      ],
      totalCount: 2,
      page: 1,
      pageSize: 10,
      stats: { total: 2, students: 1 },
    });
  });

  it("returns an empty page when userIds is an empty array", async () => {
    vi.mocked(profileRepository.countProfiles)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 5,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 3,
        status: 200,
        statusText: "OK",
      } as never);

    const result = await listEmailingRecipientsPageForManager(
      adminClient,
      actor.userId,
      { userIds: [] }
    );

    expect(profileRepository.listProfilesPage).not.toHaveBeenCalled();
    expect(result.users).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.stats).toEqual({ total: 5, students: 3 });
  });
});

describe("listEmailingRecipientsForBulkForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads role-filtered profiles and hydrates emails", async () => {
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [
        {
          id: "student-1",
          full_name: "Student One",
          role: ROLES.STUDENT,
          is_instructor: false,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([["student-1", "student@school.com"]]),
      error: null,
    });

    const users = await listEmailingRecipientsForBulkForManager(
      adminClient,
      actor.userId,
      [ROLES.STUDENT]
    );

    expect(profileRepository.listProfiles).toHaveBeenCalledWith(adminClient, {
      roles: [ROLES.STUDENT],
    });
    expect(users).toEqual([
      {
        id: "student-1",
        full_name: "Student One",
        role: ROLES.STUDENT,
        is_instructor: false,
        created_at: "2026-01-02T00:00:00.000Z",
        email: "student@school.com",
      },
    ]);
  });
});

describe("createStaffUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects non-manager actors", async () => {
    const result = await createStaffUser(
      adminClient,
      null,
      actor,
      validStaffInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
  });

  it("returns field errors for invalid input", async () => {
    const result = await createStaffUser(adminClient, actor.userId, actor, {
      ...validStaffInput,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("requires a full name", async () => {
    const result = await createStaffUser(adminClient, actor.userId, actor, {
      ...validStaffInput,
      fullName: "  ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.fullName).toBeDefined();
    }
    expect(authRepository.createAuthUser).not.toHaveBeenCalled();
  });

  it("rejects student role", async () => {
    const result = await createStaffUser(adminClient, actor.userId, actor, {
      ...validStaffInput,
      role: ROLES.STUDENT,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.role).toBeDefined();
    }
  });

  it("returns email duplicate error", async () => {
    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    const result = await createStaffUser(
      adminClient,
      actor.userId,
      actor,
      validStaffInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toEqual(["This email is already in use."]);
    }
  });

  it("creates auth user, profile, and syncs role on success", async () => {
    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(authRepository.createAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: {
        id: "user-1",
        role: ROLES.TEACHER,
        is_instructor: false,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(roleService.syncAuthUserRole).mockResolvedValue(undefined);

    const result = await createStaffUser(
      adminClient,
      actor.userId,
      actor,
      validStaffInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe("teacher@school.com");
      expect(result.user.full_name).toBe("Teacher One");
      expect(result.message).toBe("Staff account created.");
    }

    expect(authRepository.createAuthUser).toHaveBeenCalledWith(adminClient, {
      email: "teacher@school.com",
      password: "secret123",
      fullName: "Teacher One",
      role: ROLES.TEACHER,
    });
    expect(profileRepository.createProfile).toHaveBeenCalledWith(adminClient, {
      id: "user-1",
      full_name: "Teacher One",
      role: ROLES.TEACHER,
      is_instructor: false,
    });
    expect(roleService.syncAuthUserRole).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      ROLES.TEACHER
    );
  });

  it("defaults a blank password to the literal password string", async () => {
    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(authRepository.createAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: {
        id: "user-1",
        role: ROLES.TEACHER,
        is_instructor: false,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(roleService.syncAuthUserRole).mockResolvedValue(undefined);

    const result = await createStaffUser(adminClient, actor.userId, actor, {
      ...validStaffInput,
      password: "",
    });

    expect(result.success).toBe(true);
    expect(authRepository.createAuthUser).toHaveBeenCalledWith(adminClient, {
      email: "teacher@school.com",
      password: DEFAULT_CREATED_STUDENT_PASSWORD,
      fullName: "Teacher One",
      role: ROLES.TEACHER,
    });
  });

  it("rolls back auth user when profile creation fails", async () => {
    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(authRepository.createAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: null,
      error: { message: "Profile insert failed.", name: "PostgrestError", details: "", hint: "", code: "500" },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    });

    vi.mocked(authRepository.deleteAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    const result = await createStaffUser(
      adminClient,
      actor.userId,
      actor,
      validStaffInput
    );

    expect(result.success).toBe(false);
    expect(authRepository.deleteAuthUser).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
  });
});

describe("updateManagerUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("clears instructor-related data when is_instructor flips off", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        full_name: "Teacher One",
        role: ROLES.TEACHER,
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    vi.mocked(authRepository.getAuthUserById).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    vi.mocked(profileRepository.updateProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        full_name: "Teacher Renamed",
        role: ROLES.TEACHER,
        is_instructor: false,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(clearInstructorWorkshopRelatedData).mockResolvedValue({
      error: null,
    });
    vi.mocked(authRepository.updateAuthUserByAdmin).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    vi.mocked(
      studentProfileRepository.findStudentProfileByUserId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateManagerUser(
      adminClient,
      actor.userId,
      actor,
      {
        userId: "user-1",
        fullName: "Teacher Renamed",
        email: "teacher@school.com",
        role: ROLES.TEACHER,
        is_instructor: false,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.full_name).toBe("Teacher Renamed");
    }
    expect(clearInstructorWorkshopRelatedData).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
    expect(profileRepository.updateProfileById).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      { full_name: "Teacher Renamed", role: ROLES.TEACHER, is_instructor: false }
    );
    expect(authRepository.updateAuthUserByAdmin).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      { email: "teacher@school.com", fullName: "Teacher Renamed" }
    );
  });
});
