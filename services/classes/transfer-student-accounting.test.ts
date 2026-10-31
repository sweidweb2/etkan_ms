import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as accountingSync from "@/services/accounting/accounting-sync.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { transferStudentBetweenClassesForManager } from "@/services/classes/class.service";
import * as sessionService from "@/services/classes/session.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-teacher.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/services/accounting/accounting-sync.service");
vi.mock("@/services/students/student.service", () => ({
  listStudentsForManager: vi.fn(),
}));
vi.mock("@/services/classes/session.service", () => ({
  seedLateJoinAttendeesForStudent: vi.fn().mockResolvedValue(undefined),
  seedLateJoinStudentTasksForStudent: vi.fn().mockResolvedValue(undefined),
  ensureSessionAttendeesForMembers: vi.fn(),
}));
vi.mock("@/services/classes/class-computed-grade-lock.service", () => ({
  assertClassStructureUnlockedForComputedGrades: vi.fn(),
  assertStudentGradeInputsUnlockedForComputedGrade: vi.fn(),
}));
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
  role: ROLES.MANAGER,
};

const fromClassId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const toClassId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const studentProfileId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const userId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const fromEnrollmentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const toEnrollmentId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const fromClassDetail = {
  id: fromClassId,
  subject_id: "subject-1",
  name: "Math A",
  status: "in_progress",
  semester_id: "sem-1",
  created_at: "2026-01-01T00:00:00.000Z",
  subjects: { name: "Mathematics", nb_sessions: 12 },
  semesters: { name: "Fall 2026" },
};

const toClassDetail = {
  ...fromClassDetail,
  id: toClassId,
  name: "Math B",
};

describe("transferStudentBetweenClassesForManager accounting (E7)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(accountingSync.onStudentLeftClass).mockResolvedValue({
      phase: null,
      spp: null,
      retained: true,
    } as never);
    vi.mocked(accountingSync.onStudentJoinedClass).mockResolvedValue({
      phase: null,
      spp: null,
      created: false,
      phaseReopened: false,
    } as never);
    vi.mocked(sessionService.seedLateJoinAttendeesForStudent).mockResolvedValue(
      undefined as never
    );
    vi.mocked(
      sessionService.seedLateJoinStudentTasksForStudent
    ).mockResolvedValue(undefined as never);
  });

  it("retains source payment sync and skips destination payment sync", async () => {
    vi.mocked(classRepository.findClassDetailById).mockImplementation(
      async (_client, classId) =>
        ({
          data:
            classId === fromClassId
              ? fromClassDetail
              : classId === toClassId
                ? toClassDetail
                : null,
          error: null,
          count: null,
          status: 200,
          statusText: "OK",
        }) as never
    );

    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue(
      {
        data: {
          id: studentProfileId,
          user_id: userId,
          full_name: "Student Transfer",
          phone: null,
          birth_date: null,
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    vi.mocked(
      studentClassRepository.transferStudentBetweenClasses
    ).mockResolvedValue({
      data: {
        ok: true,
        from: {
          id: fromEnrollmentId,
          user_id: userId,
          class_id: fromClassId,
          joined_at: "2026-01-01T00:00:00.000Z",
        },
        to: {
          id: toEnrollmentId,
          user_id: userId,
          class_id: toClassId,
          joined_at: "2026-07-31T00:00:00.000Z",
        },
      },
      error: null,
    } as never);

    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: userId,
        username: "student",
        role: "student",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(authRepository.getAuthUserById).mockResolvedValue({
      data: { user: { email: "student@example.com" } },
      error: null,
    } as never);

    vi.mocked(
      finalExamRepository.ensureEnrollmentFinalExamGrade
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await transferStudentBetweenClassesForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_profile_id: studentProfileId,
        from_class_id: fromClassId,
        to_class_id: toClassId,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.from_class_id).toBe(fromClassId);
      expect(result.to_class_id).toBe(toClassId);
      expect(result.student.user_id).toBe(userId);
      expect(result.student.student_profile_id).toBe(studentProfileId);
      expect(result.message).toBe(
        "Student Transfer transferred. Destination billing was not auto-assigned."
      );
    }

    expect(accountingSync.onStudentLeftClass).toHaveBeenCalledWith(
      adminClient,
      { studentId: userId, classId: fromClassId },
      actor
    );
    const leaveResult = await vi.mocked(accountingSync.onStudentLeftClass).mock
      .results[0]?.value;
    expect(leaveResult).toEqual(
      expect.objectContaining({
        retained: true,
      })
    );
    expect(accountingSync.onStudentJoinedClass).not.toHaveBeenCalled();
    expect(
      studentClassRepository.transferStudentBetweenClasses
    ).toHaveBeenCalledWith(adminClient, userId, fromClassId, toClassId);
    expect(
      studentClassRepository.createStudentClassEnrollment
    ).not.toHaveBeenCalled();
    expect(studentClassRepository.deleteStudentClassById).not.toHaveBeenCalled();
    expect(studentClassRepository.enrollStudentInClass).not.toHaveBeenCalled();
    expect(
      studentClassRepository.findStudentClassByUserAndClass
    ).not.toHaveBeenCalled();
    expect(sessionService.seedLateJoinAttendeesForStudent).toHaveBeenCalledWith(
      adminClient,
      toClassId,
      userId
    );
    expect(
      sessionService.seedLateJoinStudentTasksForStudent
    ).toHaveBeenCalledWith(adminClient, toClassId, userId);
  });
});
