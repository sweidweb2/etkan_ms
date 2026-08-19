import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { ROLES } from "@/lib/constants/roles";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import * as profileService from "@/services/profile.service";
import * as roleService from "@/services/role.service";
import {
  createStudent,
  getStudentDetailStatsForManager,
  getStudentForManager,
  listStudentsForManager,
  listStudentsWithoutInProgressClassForManager,
  updateStudent,
} from "@/services/student.service";
import { PERMISSIONS } from "@/lib/constants/permissions";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/profile.service");
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
  email: "jane@school.com",
  app_metadata: { role: ROLES.STUDENT },
  user_metadata: { full_name: "Jane Doe", username: "jane" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

const studentProfile = {
  id: "student-profile-1",
  user_id: "user-1",
  full_name: "Jane Doe",
  birth_date: "2010-05-01",
  phone: "+96170000000",
  status: STUDENT_STATUSES.ACTIVE,
  created_at: "2026-01-01T00:00:00.000Z",
};

const validStudentInput = {
  username: "jane",
  fullName: "Jane Doe",
  email: "jane@school.com",
  password: "secret123",
  confirmPassword: "secret123",
  birthDate: "2010-05-01",
  phone: "+96170000000",
};

function mockStudentLookups() {
  vi.mocked(profileRepository.findProfileById).mockResolvedValue({
    data: {
      id: "user-1",
      username: "jane",
      role: ROLES.STUDENT,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  });

  vi.mocked(authRepository.getAuthUserById).mockResolvedValue({
    data: { user: authUser },
    error: null,
  });
}

describe("listStudentsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listStudentsForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns students with profile and auth data merged", async () => {
    vi.mocked(studentProfileRepository.listStudentProfiles).mockResolvedValue({
      data: [studentProfile],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [
        {
          id: "user-1",
          username: "jane",
          role: ROLES.STUDENT,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([["user-1", "jane@school.com"]]),
      error: null,
    });

    const students = await listStudentsForManager(adminClient, actor.userId);

    expect(students).toEqual([
      {
        user_id: "user-1",
        student_profile_id: "student-profile-1",
        username: "jane",
        email: "jane@school.com",
        full_name: "Jane Doe",
        birth_date: "2010-05-01",
        phone: "+96170000000",
        status: STUDENT_STATUSES.ACTIVE,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("getStudentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null for unknown student profile id", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const student = await getStudentForManager(
      adminClient,
      actor.userId,
      "missing-id"
    );

    expect(student).toBeNull();
  });

  it("returns mapped student row", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: studentProfile,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    mockStudentLookups();

    const student = await getStudentForManager(
      adminClient,
      actor.userId,
      "student-profile-1"
    );

    expect(student?.full_name).toBe("Jane Doe");
    expect(student?.email).toBe("jane@school.com");
  });
});

describe("getStudentDetailStatsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("aggregates class and task counts", async () => {
    vi.mocked(studentClassRepository.countStudentClassesByUserId).mockResolvedValue({
      count: 4,
      error: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(studentClassRepository.listStudentClassesByUserId).mockResolvedValue({
      data: [
        {
          id: "sc-1",
          user_id: "user-1",
          class_id: "class-done",
          joined_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "sc-2",
          user_id: "user-1",
          class_id: "class-active",
          joined_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "sc-3",
          user_id: "user-1",
          class_id: "class-2",
          joined_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "sc-4",
          user_id: "user-1",
          class_id: "class-3",
          joined_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(classRepository.listClassesWithSubjectByIds).mockResolvedValue({
      data: [
        { id: "class-done", status: "done", name: "Done", subjects: { name: "S" } },
        { id: "class-active", status: "in_progress", name: "Active", subjects: { name: "S" } },
        { id: "class-2", status: "scheduled", name: "Two", subjects: { name: "S" } },
        { id: "class-3", status: "scheduled", name: "Three", subjects: { name: "S" } },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(studentTaskRepository.countStudentTasksByStudentId).mockResolvedValue({
      count: 10,
      error: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(studentTaskRepository.countStudentTasksDoneByStudentId).mockResolvedValue({
      count: 6,
      error: null,
      status: 200,
      statusText: "OK",
    });

    const stats = await getStudentDetailStatsForManager(
      adminClient,
      actor.userId,
      "user-1"
    );

    expect(stats).toEqual({
      classesRegistered: 4,
      classesDone: 1,
      classesPending: 3,
      tasksDone: 6,
      tasksTotal: 10,
    });

    expect(studentClassRepository.listStudentClassesByUserId).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
    expect(classRepository.listClassesWithSubjectByIds).toHaveBeenCalled();
  });
});

describe("createStudent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects non-manager actors", async () => {
    const result = await createStudent(
      adminClient,
      null,
      actor,
      validStudentInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
  });

  it("returns field errors for invalid input", async () => {
    const result = await createStudent(adminClient, actor.userId, actor, {
      ...validStudentInput,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("returns username duplicate error", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: { id: "existing", username: "jane" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createStudent(
      adminClient,
      actor.userId,
      actor,
      validStudentInput
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

    const result = await createStudent(
      adminClient,
      actor.userId,
      actor,
      validStudentInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toEqual(["This email is already in use."]);
    }
  });

  it("creates auth user, registers student, and syncs role on success", async () => {
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

    vi.mocked(profileService.ensureStudentRegistration).mockResolvedValue({
      profileId: "user-1",
    });

    vi.mocked(roleService.syncAuthUserRole).mockResolvedValue(undefined);

    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue({
      data: studentProfile,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    mockStudentLookups();

    const result = await createStudent(
      adminClient,
      actor.userId,
      actor,
      validStudentInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.student.email).toBe("jane@school.com");
      expect(result.message).toBe("Student account created.");
    }

    expect(authRepository.createAuthUser).toHaveBeenCalledWith(adminClient, {
      email: "jane@school.com",
      password: "secret123",
      username: "jane",
      fullName: "Jane Doe",
      role: ROLES.STUDENT,
    });
    expect(profileService.ensureStudentRegistration).toHaveBeenCalled();
    expect(roleService.syncAuthUserRole).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      ROLES.STUDENT
    );
  });

  it("rolls back auth user when registration fails", async () => {
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

    vi.mocked(profileService.ensureStudentRegistration).mockRejectedValue(
      new Error("Registration failed.")
    );

    vi.mocked(authRepository.deleteAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    const result = await createStudent(
      adminClient,
      actor.userId,
      actor,
      validStudentInput
    );

    expect(result.success).toBe(false);
    expect(authRepository.deleteAuthUser).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
  });
});

describe("updateStudent", () => {
  const updateInput = {
    studentProfileId: "student-profile-1",
    userId: "user-1",
    username: "jane",
    fullName: "Jane Doe",
    email: "jane@school.com",
    birthDate: "2010-05-01",
    phone: "+96170000000",
    status: STUDENT_STATUSES.ACTIVE,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects non-manager actors", async () => {
    const result = await updateStudent(
      adminClient,
      null,
      actor,
      updateInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
  });

  it("returns username duplicate error", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: studentProfile,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "jane",
        role: ROLES.STUDENT,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: { id: "other-user", username: "jane" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateStudent(
      adminClient,
      actor.userId,
      actor,
      updateInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.username).toEqual([
        "This username is already taken.",
      ]);
    }
  });

  it("updates profile, auth, and student profile on success", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: studentProfile,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "jane",
        role: ROLES.STUDENT,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: { id: "user-1", username: "jane" },
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
        username: "jane",
        role: ROLES.STUDENT,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.updateAuthUserByAdmin).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    vi.mocked(studentProfileRepository.updateStudentProfileById).mockResolvedValue({
      data: studentProfile,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    mockStudentLookups();

    const result = await updateStudent(
      adminClient,
      actor.userId,
      actor,
      updateInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toBe("Student details updated.");
      expect(result.student.full_name).toBe("Jane Doe");
    }

    expect(profileRepository.updateProfileById).toHaveBeenCalled();
    expect(authRepository.updateAuthUserByAdmin).toHaveBeenCalled();
    expect(studentProfileRepository.updateStudentProfileById).toHaveBeenCalled();
  });
});

describe("listStudentsWithoutInProgressClassForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns students who are not enrolled on any in-progress class", async () => {
    const otherProfile = {
      id: "student-profile-2",
      user_id: "user-2",
      full_name: "Alex Other",
      birth_date: null,
      phone: null,
      status: STUDENT_STATUSES.ACTIVE,
      created_at: "2026-01-02T00:00:00.000Z",
    };

    vi.mocked(studentProfileRepository.listStudentProfiles).mockResolvedValue({
      data: [studentProfile, otherProfile],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(classRepository.listInProgressClasses).mockResolvedValue({
      data: [{ id: "class-1", name: "Math" }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      studentClassRepository.listMemberUserIdsByClassIds
    ).mockResolvedValue({
      data: [{ user_id: "user-1", class_id: "class-1" }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await listStudentsWithoutInProgressClassForManager(
      adminClient,
      actor.userId,
      PERMISSIONS.CLASSES_VIEW
    );

    expect(result).toEqual([
      {
        user_id: "user-2",
        student_profile_id: "student-profile-2",
        full_name: "Alex Other",
        phone: null,
        status: STUDENT_STATUSES.ACTIVE,
      },
    ]);
  });
});
