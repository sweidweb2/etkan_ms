import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as accountingSync from "@/services/accounting-sync.service";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import { transferStudentBetweenClassesForManager } from "@/services/class.service";
import * as sessionService from "@/services/session.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-teacher.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/services/accounting-sync.service");
vi.mock("@/services/student.service", () => ({
  listStudentsForManager: vi.fn(),
}));
vi.mock("@/services/session.service", () => ({
  seedLateJoinAttendeesForStudent: vi.fn().mockResolvedValue(undefined),
  seedLateJoinStudentTasksForStudent: vi.fn().mockResolvedValue(undefined),
  ensureSessionAttendeesForEnrolledStudents: vi.fn(),
}));
vi.mock("@/services/class-computed-grade-lock.service", () => ({
  assertClassStructureUnlockedForComputedGrades: vi.fn(),
  assertStudentGradeInputsUnlockedForComputedGrade: vi.fn(),
}));
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
      cancelled: true,
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

  it("cancels source payment sync and skips destination payment sync", async () => {
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
      studentClassRepository.findStudentClassByUserAndClass
    ).mockImplementation(async (_client, _userId, classId) => {
      if (classId === fromClassId) {
        return {
          data: {
            id: fromEnrollmentId,
            user_id: userId,
            class_id: fromClassId,
            status: "enrolled",
            joined_at: "2026-01-01T00:00:00.000Z",
          },
          error: null,
          count: null,
          status: 200,
          statusText: "OK",
        } as never;
      }

      return {
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never;
    });

    vi.mocked(studentClassRepository.updateStudentClassStatus).mockResolvedValue(
      {
        data: {
          id: fromEnrollmentId,
          user_id: userId,
          class_id: fromClassId,
          status: "stopped",
          joined_at: "2026-01-01T00:00:00.000Z",
        },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    vi.mocked(
      studentClassRepository.createStudentClassEnrollment
    ).mockResolvedValue({
      data: {
        id: toEnrollmentId,
        user_id: userId,
        class_id: toClassId,
        status: "enrolled",
        joined_at: "2026-07-31T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
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

    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(
      studentClassRepository.countStudentClassesByClassId
    ).mockResolvedValue({
      count: 1,
      error: null,
      data: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      classTeacherRepository.countClassTeachersByClassId
    ).mockResolvedValue({
      count: 0,
      error: null,
      data: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(sessionRepository.listSessionCountsByClassIds).mockResolvedValue({
      data: [],
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
    }

    expect(accountingSync.onStudentLeftClass).toHaveBeenCalledWith(
      adminClient,
      { studentId: userId, classId: fromClassId },
      actor
    );
    expect(accountingSync.onStudentJoinedClass).not.toHaveBeenCalled();
    expect(
      studentClassRepository.createStudentClassEnrollment
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        user_id: userId,
        class_id: toClassId,
        status: "enrolled",
      })
    );
  });
});
