import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATTENDEE_STATUSES } from "@/lib/constants/manager-attendee-status";
import { LATE_ENROLLMENT_NOTE } from "@/lib/constants/manager-late-enrollment";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  addStudentToClassForManager,
  createFinalExamForManager,
  updateFinalExamForManager,
} from "@/services/class.service";

vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-teacher.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-course-grade.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/task.repository");
vi.mock("@/services/student.service", () => ({
  listStudentsForManager: vi.fn(),
}));
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

function mockUnlockedComputedGrades() {
  vi.mocked(
    studentCourseGradeRepository.countStudentCourseGradesByClassId
  ).mockResolvedValue({ count: 0, error: null } as never);
  vi.mocked(
    studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
  ).mockResolvedValue({ data: null, error: null } as never);
}


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

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const examId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const studentA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const studentB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const studentProfileId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const sessionOneId = "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1";
const sessionTwoId = "f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2";
const taskOneId = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const taskTwoId = "a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2";

const classRecord = {
  id: classId,
  name: "Robotics A",
  subject_id: "subject-1",
  semester_id: "semester-1",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
};

const classDetailRecord = {
  ...classRecord,
  subjects: { name: "Robotics", nb_sessions: 12 },
  semesters: { name: "Fall 2026" },
};

const examRecord = {
  id: examId,
  class_id: classId,
  title: "Final exam",
  description: null,
  due_date: null as string | null,
  max_grade: 100,
  created_at: "2026-07-10T00:00:00.000Z",
};

describe("createFinalExamForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("rejects non-managers", async () => {
    const result = await createFinalExamForManager(
      adminClient,
      null,
      actor,
      { class_id: classId, title: "Final exam" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
    expect(finalExamRepository.createFinalExam).not.toHaveBeenCalled();
  });

  it("creates pending empty grade rows for every enrolled student", async () => {
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: classRecord,
      error: null,
    } as never);
    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(finalExamRepository.createFinalExam).mockResolvedValue({
      data: examRecord,
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.listMemberUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: studentA }, { user_id: studentB }],
      error: null,
    } as never);
    vi.mocked(
      finalExamRepository.createStudentFinalExamGrades
    ).mockResolvedValue({
      data: [
        {
          id: "grade-a",
          final_exam_id: examId,
          student_id: studentA,
          status: STUDENT_TASK_STATUSES.PENDING,
          submitted_at: null,
          grade: null,
          notes: null,
          graded_at: null,
          created_at: "2026-07-10T00:00:01.000Z",
        },
        {
          id: "grade-b",
          final_exam_id: examId,
          student_id: studentB,
          status: STUDENT_TASK_STATUSES.PENDING,
          submitted_at: null,
          grade: null,
          notes: null,
          graded_at: null,
          created_at: "2026-07-10T00:00:01.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [
        { user_id: studentA, full_name: "Alice" },
        { user_id: studentB, full_name: "Bob" },
      ],
      error: null,
    } as never);

    const result = await createFinalExamForManager(
      adminClient,
      actor.userId,
      actor,
      {
        class_id: classId,
        title: "Final exam",
        max_grade: 100,
      }
    );

    expect(result.success).toBe(true);
    expect(
      studentClassRepository.listMemberUserIdsByClassId
    ).toHaveBeenCalledWith(adminClient, classId);
    expect(finalExamRepository.createStudentFinalExamGrades).toHaveBeenCalledWith(
      adminClient,
      [
        {
          final_exam_id: examId,
          student_id: studentA,
          status: STUDENT_TASK_STATUSES.PENDING,
        },
        {
          final_exam_id: examId,
          student_id: studentB,
          status: STUDENT_TASK_STATUSES.PENDING,
        },
      ]
    );

    if (result.success) {
      expect(result.studentGrades).toHaveLength(2);
      expect(result.studentGrades.every((row) => row.status === "pending")).toBe(
        true
      );
      expect(
        result.studentGrades.every(
          (row) =>
            row.grade === null &&
            row.notes === null &&
            row.submitted_at === null &&
            row.graded_at === null
        )
      ).toBe(true);
    }
  });

  it("rolls back the exam when grade rows fail to insert", async () => {
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: classRecord,
      error: null,
    } as never);
    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(finalExamRepository.createFinalExam).mockResolvedValue({
      data: examRecord,
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.listMemberUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: studentA }],
      error: null,
    } as never);
    vi.mocked(
      finalExamRepository.createStudentFinalExamGrades
    ).mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    } as never);
    vi.mocked(finalExamRepository.deleteFinalExamById).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await createFinalExamForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, title: "Final exam" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("insert failed");
    }
    expect(finalExamRepository.deleteFinalExamById).toHaveBeenCalledWith(
      adminClient,
      examId
    );
  });

  it("blocks final exam creation when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: classRecord,
      error: null,
    } as never);
    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await createFinalExamForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, title: "Final exam" }
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(finalExamRepository.createFinalExam).not.toHaveBeenCalled();
  });
});

describe("addStudentToClassForManager final exam grade", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);

    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetailRecord,
      error: null,
    } as never);
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue(
      {
        data: {
          id: studentProfileId,
          user_id: studentA,
          full_name: "Alice",
          phone: null,
        },
        error: null,
      } as never
    );
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.createStudentClassEnrollment
    ).mockResolvedValue({
      data: {
        id: "enrollment-1",
        user_id: studentA,
        class_id: classId,
        status: "in_progress",
        joined_at: "2026-07-10T12:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: { id: studentA, username: "alice" },
      error: null,
    } as never);
    vi.mocked(authRepository.getAuthUserById).mockResolvedValue({
      data: { user: { email: "alice@school.com" } },
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.countStudentClassesByClassId
    ).mockResolvedValue({
      count: 1,
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
    vi.mocked(sessionRepository.listSessionIdsByClassId).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.listAttendeesBySessionIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.createAttendees).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(taskRepository.listTasksBySessionIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.listStudentTasksByTaskIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.createStudentTasks).mockResolvedValue({
      data: [],
      error: null,
    } as never);
  });

  it("creates a pending grade when final exam due date is still upcoming", async () => {
    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: { ...examRecord, due_date: futureDue },
      error: null,
    } as never);
    vi.mocked(
      finalExamRepository.createStudentFinalExamGrade
    ).mockResolvedValue({
      data: {
        id: "grade-late-join",
        final_exam_id: examId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
        created_at: "2026-07-10T12:00:01.000Z",
      },
      error: null,
    } as never);

    const result = await addStudentToClassForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, studentProfileId }
    );

    expect(result.success).toBe(true);
    expect(finalExamRepository.createStudentFinalExamGrade).toHaveBeenCalledWith(
      adminClient,
      {
        final_exam_id: examId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
      }
    );
  });

  it("creates a missing grade with 0 when final exam due date is past", async () => {
    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: { ...examRecord, due_date: pastDue },
      error: null,
    } as never);
    vi.mocked(
      finalExamRepository.createStudentFinalExamGrade
    ).mockResolvedValue({
      data: {
        id: "grade-late-join",
        final_exam_id: examId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.MISSING,
        submitted_at: null,
        grade: 0,
        notes: "he entered late to this class",
        graded_at: null,
        created_at: "2026-07-10T12:00:01.000Z",
      },
      error: null,
    } as never);

    const result = await addStudentToClassForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, studentProfileId }
    );

    expect(result.success).toBe(true);
    expect(finalExamRepository.createStudentFinalExamGrade).toHaveBeenCalledWith(
      adminClient,
      {
        final_exam_id: examId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.MISSING,
        grade: 0,
        notes: "he entered late to this class",
      }
    );

    if (result.success) {
      expect(result.studentGrade?.status).toBe("missing");
      expect(result.studentGrade?.grade).toBe(0);
      expect(result.studentGrade?.notes).toBe("he entered late to this class");
    }
  });

  it("seeds absent attendee rows with late-join note for existing sessions", async () => {
    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(sessionRepository.listSessionIdsByClassId).mockResolvedValue({
      data: [
        { id: sessionOneId, nb_order: 1, topic: "Intro" },
        { id: sessionTwoId, nb_order: 2, topic: "Sensors" },
      ],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.listAttendeesBySessionIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.createAttendees).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await addStudentToClassForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, studentProfileId }
    );

    expect(result.success).toBe(true);
    expect(attendeeRepository.createAttendees).toHaveBeenCalledWith(
      adminClient,
      [
        {
          session_id: sessionOneId,
          student_id: studentA,
          status: ATTENDEE_STATUSES.ABSENT,
          note: LATE_ENROLLMENT_NOTE,
        },
        {
          session_id: sessionTwoId,
          student_id: studentA,
          status: ATTENDEE_STATUSES.ABSENT,
          note: LATE_ENROLLMENT_NOTE,
        },
      ]
    );
  });

  it("skips sessions that already have an attendee for the student", async () => {
    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(sessionRepository.listSessionIdsByClassId).mockResolvedValue({
      data: [
        { id: sessionOneId, nb_order: 1, topic: "Intro" },
        { id: sessionTwoId, nb_order: 2, topic: "Sensors" },
      ],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.listAttendeesBySessionIds).mockResolvedValue({
      data: [
        {
          session_id: sessionOneId,
          student_id: studentA,
          status: ATTENDEE_STATUSES.PRESENT,
        },
      ],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.createAttendees).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await addStudentToClassForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, studentProfileId }
    );

    expect(result.success).toBe(true);
    expect(attendeeRepository.createAttendees).toHaveBeenCalledWith(
      adminClient,
      [
        {
          session_id: sessionTwoId,
          student_id: studentA,
          status: ATTENDEE_STATUSES.ABSENT,
          note: LATE_ENROLLMENT_NOTE,
        },
      ]
    );
  });

  it("seeds student_task rows for existing class tasks on late enroll", async () => {
    const pastDue = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(sessionRepository.listSessionIdsByClassId).mockResolvedValue({
      data: [{ id: sessionOneId, nb_order: 1, topic: "Intro" }],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.listAttendeesBySessionIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.createAttendees).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(taskRepository.listTasksBySessionIds).mockResolvedValue({
      data: [
        {
          id: taskOneId,
          session_id: sessionOneId,
          max_grade: 100,
          due_date: pastDue,
        },
        {
          id: taskTwoId,
          session_id: sessionOneId,
          max_grade: 50,
          due_date: futureDue,
        },
      ],
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.listStudentTasksByTaskIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.createStudentTasks).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await addStudentToClassForManager(
      adminClient,
      actor.userId,
      actor,
      { class_id: classId, studentProfileId }
    );

    expect(result.success).toBe(true);
    expect(studentTaskRepository.createStudentTasks).toHaveBeenCalledWith(
      adminClient,
      [
        {
          task_id: taskOneId,
          student_id: studentA,
          status: STUDENT_TASK_STATUSES.MISSING,
          grade: 0,
          notes: LATE_ENROLLMENT_NOTE,
        },
        {
          task_id: taskTwoId,
          student_id: studentA,
          status: STUDENT_TASK_STATUSES.PENDING,
        },
      ]
    );
  });
});

describe("updateFinalExamForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("rejects non-managers", async () => {
    const result = await updateFinalExamForManager(
      adminClient,
      null,
      actor,
      { id: examId, title: "Updated" }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
  });

  it("updates final exam fields with validation", async () => {
    vi.mocked(finalExamRepository.findFinalExamById).mockResolvedValue({
      data: examRecord,
      error: null,
    } as never);
    vi.mocked(finalExamRepository.updateFinalExam).mockResolvedValue({
      data: {
        ...examRecord,
        title: "Midterm final",
        description: "Updated description",
        max_grade: 80,
      },
      error: null,
    } as never);

    const result = await updateFinalExamForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: examId,
        title: "Midterm final",
        description: "Updated description",
        max_grade: 80,
      }
    );

    expect(result.success).toBe(true);
    expect(finalExamRepository.updateFinalExam).toHaveBeenCalledWith(
      adminClient,
      examId,
      expect.objectContaining({
        title: "Midterm final",
        description: "Updated description",
        max_grade: 80,
      })
    );
    if (result.success) {
      expect(result.finalExam.title).toBe("Midterm final");
      expect(result.message).toBe("Final exam updated.");
    }
  });

  it("blocks updates when computed course grades exist", async () => {
    vi.mocked(finalExamRepository.findFinalExamById).mockResolvedValue({
      data: examRecord,
      error: null,
    } as never);
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);

    const result = await updateFinalExamForManager(
      adminClient,
      actor.userId,
      actor,
      { id: examId, title: "Cannot update", max_grade: 50 }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR);
    }
    expect(finalExamRepository.updateFinalExam).not.toHaveBeenCalled();
  });

  it("rejects empty title", async () => {
    const result = await updateFinalExamForManager(
      adminClient,
      actor.userId,
      actor,
      { id: examId, title: "   " }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.title).toBeDefined();
    }
    expect(finalExamRepository.updateFinalExam).not.toHaveBeenCalled();
  });
});
