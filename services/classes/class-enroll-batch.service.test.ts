import { beforeEach, describe, expect, it, vi } from "vitest";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as accountingSync from "@/services/accounting/accounting-sync.service";
import * as authorizationService from "@/services/auth/authorization.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  addStudentsToClassForManager,
  removeStudentFromClassForManager,
} from "@/services/classes/class.service";

vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-teacher.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/services/accounting/accounting-sync.service");
vi.mock("@/services/students/student.service", () => ({
  listStudentsForManager: vi.fn(),
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
};

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const aliceProfileId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const bobProfileId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const inactiveProfileId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const missingProfileId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const aliceUserId = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const bobUserId = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2";
const inactiveUserId = "c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3";
const enrollmentId = "d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4";

const classDetailRecord = {
  id: classId,
  name: "Robotics A",
  subject_id: "subject-1",
  semester_id: "semester-1",
  status: "in_progress",
  created_at: "2026-01-01T00:00:00.000Z",
  subjects: { name: "Robotics", nb_sessions: 12 },
  semesters: { name: "Fall 2026" },
};

describe("addStudentsToClassForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(authorizationService.getUnauthorizedError).mockImplementation(
      async (_c, userId) => (userId ? null : "Unauthorized.")
    );
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetailRecord,
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.countStudentClassesByClassId
    ).mockResolvedValue({
      count: 2,
      error: null,
    } as never);
    vi.mocked(
      classTeacherRepository.countClassTeachersByClassId
    ).mockResolvedValue({
      count: 0,
      error: null,
    } as never);
    vi.mocked(sessionRepository.listSessionCountsByClassIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(
      attendeeRepository.seedLateJoinAttendeesForStudents
    ).mockResolvedValue({
      data: 0,
      error: null,
    } as never);
    vi.mocked(
      studentTaskRepository.seedLateJoinStudentTasksForStudents
    ).mockResolvedValue({
      data: 0,
      error: null,
    } as never);
    vi.mocked(
      finalExamRepository.ensureEnrollmentFinalExamGrades
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [{ id: aliceUserId, username: "alice" }],
      error: null,
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([[aliceUserId, "alice@school.com"]]),
      error: null,
    });
    vi.mocked(accountingSync.onStudentsJoinedClass).mockResolvedValue([]);
  });

  it("enrolls eligible students in one batch and reports partial failures", async () => {
    vi.mocked(
      studentProfileRepository.listStudentProfilesByIds
    ).mockResolvedValue({
      data: [
        {
          id: aliceProfileId,
          user_id: aliceUserId,
          full_name: "Alice",
          phone: null,
          status: "active",
        },
        {
          id: bobProfileId,
          user_id: bobUserId,
          full_name: "Bob",
          phone: null,
          status: "active",
        },
        {
          id: inactiveProfileId,
          user_id: inactiveUserId,
          full_name: "Inactive",
          phone: null,
          status: "inactive",
        },
      ],
      error: null,
    } as never);
    vi.mocked(studentClassRepository.enrollStudentsInClass).mockResolvedValue({
      data: {
        inserted: [
          {
            id: enrollmentId,
            user_id: aliceUserId,
            class_id: classId,
            joined_at: "2026-08-19T00:00:00.000Z",
          },
        ],
        already_enrolled: [bobUserId],
      },
      error: null,
    } as never);

    const result = await addStudentsToClassForManager(
      adminClient,
      actor.userId,
      actor,
      {
        class_id: classId,
        studentProfileIds: [
          aliceProfileId,
          bobProfileId,
          inactiveProfileId,
          missingProfileId,
        ],
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.students).toHaveLength(1);
      expect(result.students[0]?.full_name).toBe("Alice");
      expect(result.classRow.enrollment_count).toBe(3);
      expect(result.message).toBe(
        "Added 1 of 4 students. 3 could not be added."
      );
    }

    expect(authorizationService.getUnauthorizedError).toHaveBeenCalledTimes(1);
    expect(
      studentClassRepository.enrollStudentsInClass
    ).toHaveBeenCalledWith(adminClient, classId, [aliceUserId, bobUserId]);
    expect(studentClassRepository.enrollStudentInClass).not.toHaveBeenCalled();
    expect(
      studentProfileRepository.findStudentProfileById
    ).not.toHaveBeenCalled();
    expect(
      attendeeRepository.seedLateJoinAttendeesForStudents
    ).toHaveBeenCalledWith(adminClient, classId, [aliceUserId]);
    expect(
      studentTaskRepository.seedLateJoinStudentTasksForStudents
    ).toHaveBeenCalledWith(adminClient, classId, [aliceUserId]);
    expect(accountingSync.onStudentsJoinedClass).toHaveBeenCalledWith(
      adminClient,
      { classId, studentIds: [aliceUserId] },
      actor
    );
    expect(accountingSync.onStudentJoinedClass).not.toHaveBeenCalled();
  });

  it("returns the first failure when nobody can be enrolled", async () => {
    vi.mocked(
      studentProfileRepository.listStudentProfilesByIds
    ).mockResolvedValue({
      data: [
        {
          id: inactiveProfileId,
          user_id: inactiveUserId,
          full_name: "Inactive",
          phone: null,
          status: "inactive",
        },
      ],
      error: null,
    } as never);
    vi.mocked(studentClassRepository.enrollStudentsInClass).mockResolvedValue({
      data: { inserted: [], already_enrolled: [] },
      error: null,
    } as never);

    const result = await addStudentsToClassForManager(
      adminClient,
      actor.userId,
      actor,
      {
        class_id: classId,
        studentProfileIds: [inactiveProfileId, missingProfileId],
      }
    );

    expect(result).toEqual({
      success: false,
      error: "Inactive students cannot be added to a class.",
      fieldErrors: {
        studentProfileIds: ["Inactive students cannot be added to a class."],
      },
    });
    expect(
      attendeeRepository.seedLateJoinAttendeesForStudents
    ).not.toHaveBeenCalled();
    expect(accountingSync.onStudentsJoinedClass).not.toHaveBeenCalled();
  });
});

describe("removeStudentFromClassForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(authorizationService.getUnauthorizedError).mockImplementation(
      async (_c, userId) => (userId ? null : "Unauthorized.")
    );
    vi.mocked(accountingSync.onStudentLeftClass).mockResolvedValue({
      phase: null,
      spp: null,
      retained: true,
    } as never);
  });

  it("deletes membership in one RPC then runs leave payment sync", async () => {
    vi.mocked(
      studentClassRepository.deleteStudentClassMembership
    ).mockResolvedValue({
      data: {
        id: enrollmentId,
        user_id: aliceUserId,
        class_id: classId,
        joined_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    } as never);

    const result = await removeStudentFromClassForManager(
      adminClient,
      actor.userId,
      actor,
      { id: enrollmentId, class_id: classId }
    );

    expect(result).toEqual({
      success: true,
      removedStudentId: enrollmentId,
      message: "Student removed from class.",
      warning: undefined,
    });
    expect(
      studentClassRepository.deleteStudentClassMembership
    ).toHaveBeenCalledWith(adminClient, enrollmentId, classId);
    expect(studentClassRepository.findStudentClassById).not.toHaveBeenCalled();
    expect(studentClassRepository.deleteStudentClassById).not.toHaveBeenCalled();
    expect(accountingSync.onStudentLeftClass).toHaveBeenCalledWith(
      adminClient,
      { studentId: aliceUserId, classId },
      actor
    );
  });

  it("returns enrollment not found when the delete RPC matches no row", async () => {
    vi.mocked(
      studentClassRepository.deleteStudentClassMembership
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await removeStudentFromClassForManager(
      adminClient,
      actor.userId,
      actor,
      { id: enrollmentId, class_id: classId }
    );

    expect(result).toEqual({
      success: false,
      error: "Enrollment not found.",
    });
    expect(accountingSync.onStudentLeftClass).not.toHaveBeenCalled();
  });
});
