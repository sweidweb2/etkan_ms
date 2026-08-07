import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { ROLES } from "@/lib/constants/roles";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import * as roleService from "@/services/role.service";
import {
  createStaffUser,
  listUsersForManager,
  updateManagerUser,
} from "@/services/user.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/lib/manager/instructors/clear-instructor-related", () => ({
  clearInstructorWorkshopRelatedData: vi.fn(),
}));
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/role.service");
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient,
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

const authUser = {
  id: "user-1",
  email: "teacher@school.com",
  app_metadata: { role: ROLES.TEACHER },
  user_metadata: { full_name: "teacher1", username: "teacher1" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

const validStaffInput = {
  username: "teacher1",
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
          username: "teacher1",
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
        username: "teacher1",
        role: ROLES.TEACHER,
        is_instructor: false,
        created_at: "2026-01-01T00:00:00.000Z",
        email: "teacher@school.com",
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

  it("returns username duplicate error", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: { id: "existing", username: "teacher1" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createStaffUser(
      adminClient,
      actor.userId,
      actor,
      validStaffInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.username).toEqual([
        "This username is already taken.",
      ]);
    }
  });

  it("returns email duplicate error", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

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
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(authRepository.createAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: { id: "user-1", role: ROLES.TEACHER, is_instructor: false },
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
      expect(result.message).toBe("Staff account created.");
    }

    expect(authRepository.createAuthUser).toHaveBeenCalledWith(adminClient, {
      email: "teacher@school.com",
      password: "secret123",
      username: "teacher1",
      fullName: "teacher1",
      role: ROLES.TEACHER,
    });
    expect(profileRepository.createProfile).toHaveBeenCalled();
    expect(roleService.syncAuthUserRole).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      ROLES.TEACHER
    );
  });

  it("rolls back auth user when profile creation fails", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

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
        username: "teacher1",
        role: ROLES.TEACHER,
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: {
        id: "user-1",
        username: "teacher1",
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
        username: "teacher1",
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
        username: "teacher1",
        email: "teacher@school.com",
        role: ROLES.TEACHER,
        is_instructor: false,
      }
    );

    expect(result.success).toBe(true);
    expect(clearInstructorWorkshopRelatedData).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
  });
});
