import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATTENDEE_STATUSES } from "@/lib/constants/manager-attendee-status";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
  STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
} from "@/lib/manager/class-grades-access";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createSessionTaskForManager,
  deleteClassSessionForManager,
  deleteSessionTaskForManager,
  ensureSessionAttendeesForMembers,
  getSessionDetailForManager,
  listClassTasksForManager,
  seedLateJoinAttendeesForStudent,
  seedLateJoinAttendeesForStudents,
  seedLateJoinStudentTasksForStudent,
  seedLateJoinStudentTasksForStudents,
  updateAttendeeForManager,
  updateClassSessionForManager,
  updateSessionSettingsForManager,
  updateSessionTaskForManager,
  updateStudentTaskForManager,
} from "@/services/classes/session.service";
import { SESSION_GROUP_GRADE_LEVELS } from "@/types/manager-session-group-grade";

vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-course-grade.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/task.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
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
const sessionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const taskId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const studentA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const studentB = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const attendeeId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const studentTaskId = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const semesterId = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2";

function mockAuthEmails(
  entries: Array<{ id: string; email: string }>
) {
  vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
    data: new Map(entries.map((entry) => [entry.id, entry.email])),
    error: null,
  });
}

const sessionRecord = {
  id: sessionId,
  class_id: classId,
  nb_order: 1,
  topic: "Intro",
  starts_at: "2026-07-10T10:00:00.000Z",
  ends_at: "2026-07-10T12:00:00.000Z",
  semester_id: null as string | null,
  group_grade_level: null as string | null,
  created_at: "2026-07-01T00:00:00.000Z",
};

const classDetailRecord = {
  id: classId,
  name: "Robotics A",
  subject_id: "subject-1",
  semester_id: semesterId,
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  subjects: { name: "Robotics", nb_sessions: 12 },
  semesters: { name: "Fall 2026" },
};

describe("getSessionDetailForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws for non-managers", async () => {
    await expect(
      getSessionDetailForManager(adminClient, null, classId, sessionId)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns null when session is missing or class mismatch", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: { ...sessionRecord, class_id: "99999999-9999-4999-8999-999999999999" },
      error: null,
    } as never);
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetailRecord,
      error: null,
    } as never);

    const result = await getSessionDetailForManager(
      adminClient,
      actor.userId,
      classId,
      sessionId
    );

    expect(result).toBeNull();
  });

  it("seeds missing attendees and returns session detail", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetailRecord,
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.listMemberUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: studentA }, { user_id: studentB }],
      error: null,
    } as never);
    vi.mocked(
      attendeeRepository.ensureSessionAttendeesForMembers
    ).mockResolvedValue({
      data: 1,
      error: null,
    } as never);
    vi.mocked(attendeeRepository.listAttendeesBySessionId).mockResolvedValue({
      data: [
        {
          id: attendeeId,
          session_id: sessionId,
          student_id: studentA,
          status: ATTENDEE_STATUSES.PRESENT,
          note: null,
          created_at: "2026-07-10T00:00:00.000Z",
        },
        {
          id: "a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0",
          session_id: sessionId,
          student_id: studentB,
          status: ATTENDEE_STATUSES.PRESENT,
          note: null,
          created_at: "2026-07-10T00:00:01.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(taskRepository.listTasksBySessionId).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(semesterRepository.listSemesters).mockResolvedValue({
      data: [{ id: semesterId, name: "Fall 2026" }],
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
    mockAuthEmails([
      { id: studentA, email: "alice@example.com" },
      { id: studentB, email: "bob@example.com" },
    ]);

    const result = await getSessionDetailForManager(
      adminClient,
      actor.userId,
      classId,
      sessionId
    );

    expect(
      attendeeRepository.ensureSessionAttendeesForMembers
    ).toHaveBeenCalledWith(adminClient, sessionId, classId);
    expect(attendeeRepository.createAttendees).not.toHaveBeenCalled();
    expect(result?.session.id).toBe(sessionId);
    expect(result?.attendees).toHaveLength(2);
    expect(result?.phaseOptions).toEqual([
      { phase_id: semesterId, phase_name: "Fall 2026" },
    ]);
  });
});

describe("listClassTasksForManager", () => {
  const laterSessionId = "c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3";
  const laterTaskId = "d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws for unauthorized actors", async () => {
    await expect(
      listClassTasksForManager(adminClient, null, classId)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns an empty list when the class has no sessions", async () => {
    vi.mocked(sessionRepository.listSessionsByClassId).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await listClassTasksForManager(
      adminClient,
      actor.userId,
      classId
    );

    expect(result).toEqual([]);
    expect(taskRepository.listTaskDetailsBySessionIds).not.toHaveBeenCalled();
  });

  it("returns tasks from every class session, newest session first", async () => {
    vi.mocked(sessionRepository.listSessionsByClassId).mockResolvedValue({
      data: [
        sessionRecord,
        {
          ...sessionRecord,
          id: laterSessionId,
          nb_order: 2,
          topic: "Sensors",
        },
      ],
      error: null,
    } as never);
    vi.mocked(taskRepository.listTaskDetailsBySessionIds).mockResolvedValue({
      data: [
        {
          id: taskId,
          session_id: sessionId,
          title: "Intro homework",
          description: "Read chapter 1",
          due_date: "2026-07-12T00:00:00.000Z",
          max_grade: 10,
          created_at: "2026-07-11T00:00:00.000Z",
        },
        {
          id: laterTaskId,
          session_id: laterSessionId,
          title: "Sensor lab",
          description: null,
          due_date: null,
          max_grade: 20,
          created_at: "2026-07-18T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const result = await listClassTasksForManager(
      adminClient,
      actor.userId,
      classId
    );

    expect(taskRepository.listTaskDetailsBySessionIds).toHaveBeenCalledWith(
      adminClient,
      [sessionId, laterSessionId]
    );
    expect(result.map((task) => task.id)).toEqual([laterTaskId, taskId]);
    expect(result[0]).toMatchObject({
      id: laterTaskId,
      session_id: laterSessionId,
      session_nb_order: 2,
      session_topic: "Sensors",
      title: "Sensor lab",
    });
  });
});

describe("updateSessionSettingsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("rejects non-managers", async () => {
    const result = await updateSessionSettingsForManager(
      adminClient,
      null,
      actor,
      {
        session_id: sessionId,
        class_id: classId,
        semester_id: semesterId,
      }
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("updates only provided settings fields", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: { id: semesterId, name: "Fall 2026" },
      error: null,
    } as never);
    vi.mocked(sessionRepository.updateSessionSettings).mockResolvedValue({
      data: { ...sessionRecord, semester_id: semesterId },
      error: null,
    } as never);

    const result = await updateSessionSettingsForManager(
      adminClient,
      actor.userId,
      actor,
      {
        session_id: sessionId,
        class_id: classId,
        semester_id: semesterId,
      }
    );

    expect(sessionRepository.updateSessionSettings).toHaveBeenCalledWith(
      adminClient,
      sessionId,
      { semester_id: semesterId }
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.linkedPhase).toEqual({
        phase_id: semesterId,
        phase_name: "Fall 2026",
      });
    }
  });

  it("updates group grade without clearing phase", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: { ...sessionRecord, semester_id: semesterId },
      error: null,
    } as never);
    vi.mocked(sessionRepository.updateSessionSettings).mockResolvedValue({
      data: {
        ...sessionRecord,
        semester_id: semesterId,
        group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
      },
      error: null,
    } as never);
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: { id: semesterId, name: "Fall 2026" },
      error: null,
    } as never);

    const result = await updateSessionSettingsForManager(
      adminClient,
      actor.userId,
      actor,
      {
        session_id: sessionId,
        class_id: classId,
        group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
      }
    );

    expect(sessionRepository.updateSessionSettings).toHaveBeenCalledWith(
      adminClient,
      sessionId,
      { group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM }
    );
    expect(result.success).toBe(true);
  });

  it("blocks group grade updates when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateSessionSettingsForManager(
      adminClient,
      actor.userId,
      actor,
      {
        session_id: sessionId,
        class_id: classId,
        group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
      }
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(sessionRepository.updateSessionSettings).not.toHaveBeenCalled();
  });

  it("blocks phase updates when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateSessionSettingsForManager(
      adminClient,
      actor.userId,
      actor,
      {
        session_id: sessionId,
        class_id: classId,
        semester_id: semesterId,
      }
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(sessionRepository.updateSessionSettings).not.toHaveBeenCalled();
  });
});

describe("updateClassSessionForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("blocks session detail edits when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateClassSessionForManager(
      adminClient,
      actor.userId,
      actor,
      {
        session_id: sessionId,
        class_id: classId,
        topic: "Updated topic",
        starts_at: "2026-07-10T10:00",
        ends_at: "2026-07-10T12:00",
      }
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(sessionRepository.updateSessionDetails).not.toHaveBeenCalled();
  });
});

describe("createSessionTaskForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("creates pending student_tasks for class members", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(taskRepository.createTask).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework 1",
        description: null,
        due_date: null,
        max_grade: 20,
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.seedStudentTasksForNewTask).mockResolvedValue(
      {
        data: [
          {
            id: "st-a",
            task_id: taskId,
            student_id: studentA,
            status: STUDENT_TASK_STATUSES.PENDING,
            submitted_at: null,
            grade: null,
            notes: null,
            graded_at: null,
          },
          {
            id: "st-b",
            task_id: taskId,
            student_id: studentB,
            status: STUDENT_TASK_STATUSES.PENDING,
            submitted_at: null,
            grade: null,
            notes: null,
            graded_at: null,
          },
        ],
        error: null,
      } as never
    );
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [
        { user_id: studentA, full_name: "Alice" },
        { user_id: studentB, full_name: "Bob" },
      ],
      error: null,
    } as never);
    mockAuthEmails([
      { id: studentA, email: "alice@example.com" },
      { id: studentB, email: "bob@example.com" },
    ]);

    const result = await createSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        class_id: classId,
        session_id: sessionId,
        title: "Homework 1",
        max_grade: 20,
      }
    );

    expect(studentTaskRepository.seedStudentTasksForNewTask).toHaveBeenCalledWith(
      adminClient,
      taskId
    );
    expect(studentTaskRepository.createStudentTasks).not.toHaveBeenCalled();
    expect(
      studentClassRepository.listMemberUserIdsByClassId
    ).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.title).toBe("Homework 1");
      expect(result.studentTasks).toHaveLength(2);
      expect(result.studentTasks.every((row) => row.status === "pending")).toBe(
        true
      );
    }
  });

  it("blocks task creation when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await createSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        class_id: classId,
        session_id: sessionId,
        title: "Homework 1",
        max_grade: 20,
      }
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(taskRepository.createTask).not.toHaveBeenCalled();
  });
});

describe("updateSessionTaskForManager", () => {
  const existingTask = {
    id: taskId,
    session_id: sessionId,
    title: "Homework 1",
    description: "Original",
    due_date: "2099-01-01T00:00:00.000Z",
    max_grade: 20,
    created_at: "2026-07-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: existingTask,
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
  });

  it("updates task metadata without clamping grades when max grade increases", async () => {
    vi.mocked(taskRepository.updateTask).mockResolvedValue({
      data: {
        ...existingTask,
        title: "Homework 1 revised",
        max_grade: 25,
      },
      error: null,
    } as never);

    const result = await updateSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: taskId,
        class_id: classId,
        session_id: sessionId,
        title: "Homework 1 revised",
        max_grade: 25,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.title).toBe("Homework 1 revised");
      expect(result.gradesClamped).toBe(false);
    }
    expect(
      studentTaskRepository.clampStudentTaskGradesAboveMax
    ).not.toHaveBeenCalled();
    expect(taskRepository.updateTask).toHaveBeenCalled();
  });

  it("clamps student grades above the new max when max grade decreases", async () => {
    vi.mocked(studentTaskRepository.clampStudentTaskGradesAboveMax).mockResolvedValue(
      {
        data: [{ id: studentTaskId }],
        error: null,
      } as never
    );
    vi.mocked(taskRepository.updateTask).mockResolvedValue({
      data: {
        ...existingTask,
        max_grade: 10,
      },
      error: null,
    } as never);

    const result = await updateSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: taskId,
        class_id: classId,
        session_id: sessionId,
        title: "Homework 1",
        max_grade: 10,
      }
    );

    expect(
      studentTaskRepository.clampStudentTaskGradesAboveMax
    ).toHaveBeenCalledWith(adminClient, taskId, 10);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.gradesClamped).toBe(true);
    }
  });

  it("does not clamp grades when max grade is unchanged", async () => {
    vi.mocked(taskRepository.updateTask).mockResolvedValue({
      data: {
        ...existingTask,
        title: "Renamed only",
      },
      error: null,
    } as never);

    const result = await updateSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: taskId,
        class_id: classId,
        session_id: sessionId,
        title: "Renamed only",
        max_grade: 20,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.gradesClamped).toBe(false);
    }
    expect(
      studentTaskRepository.clampStudentTaskGradesAboveMax
    ).not.toHaveBeenCalled();
  });

  it("blocks task update when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);

    const result = await updateSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: taskId,
        class_id: classId,
        session_id: sessionId,
        title: "Homework 1",
        max_grade: 10,
      }
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(taskRepository.updateTask).not.toHaveBeenCalled();
  });
});

describe("deleteSessionTaskForManager", () => {
  const existingTask = {
    id: taskId,
    session_id: sessionId,
    title: "Homework 1",
    description: "Original",
    due_date: "2099-01-01T00:00:00.000Z",
    max_grade: 20,
    created_at: "2026-07-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: existingTask,
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
  });

  it("deletes student task rows then the task", async () => {
    vi.mocked(studentTaskRepository.deleteStudentTasksByTaskId).mockResolvedValue({
      data: [{ id: studentTaskId }, { id: "st-b" }],
      error: null,
    } as never);
    vi.mocked(taskRepository.deleteTaskById).mockResolvedValue({
      error: null,
    } as never);

    const result = await deleteSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: taskId,
        class_id: classId,
        session_id: sessionId,
      }
    );

    expect(studentTaskRepository.deleteStudentTasksByTaskId).toHaveBeenCalledWith(
      adminClient,
      taskId
    );
    expect(taskRepository.deleteTaskById).toHaveBeenCalledWith(
      adminClient,
      taskId
    );
    expect(result).toEqual({
      success: true,
      classId,
      sessionId,
      message: "Task deleted.",
    });
  });

  it("blocks task delete when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);

    const result = await deleteSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: taskId,
        class_id: classId,
        session_id: sessionId,
      }
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(studentTaskRepository.deleteStudentTasksByTaskId).not.toHaveBeenCalled();
    expect(taskRepository.deleteTaskById).not.toHaveBeenCalled();
  });

  it("returns not found when task does not belong to the session", async () => {
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: { ...existingTask, session_id: "99999999-9999-4999-8999-999999999999" },
      error: null,
    } as never);

    const result = await deleteSessionTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: taskId,
        class_id: classId,
        session_id: sessionId,
      }
    );

    expect(result).toEqual({
      success: false,
      error: "Task not found.",
    });
    expect(taskRepository.deleteTaskById).not.toHaveBeenCalled();
  });
});

describe("updateAttendeeForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("updates attendance status and preserves note when omitted", async () => {
    vi.mocked(attendeeRepository.findAttendeeById).mockResolvedValue({
      data: {
        id: attendeeId,
        session_id: sessionId,
        student_id: studentA,
        status: ATTENDEE_STATUSES.PRESENT,
        note: "Arrived early",
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(attendeeRepository.updateAttendee).mockResolvedValue({
      data: {
        id: attendeeId,
        session_id: sessionId,
        student_id: studentA,
        status: ATTENDEE_STATUSES.ABSENT,
        note: "Arrived early",
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ user_id: studentA, full_name: "Alice" }],
      error: null,
    } as never);
    mockAuthEmails([{ id: studentA, email: "alice@example.com" }]);

    const result = await updateAttendeeForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: attendeeId,
        class_id: classId,
        session_id: sessionId,
        status: ATTENDEE_STATUSES.ABSENT,
      }
    );

    expect(attendeeRepository.updateAttendee).toHaveBeenCalledWith(
      adminClient,
      attendeeId,
      { status: ATTENDEE_STATUSES.ABSENT, note: "Arrived early" }
    );
    expect(result.success).toBe(true);
  });

  it("blocks attendance updates only for students with a computed grade", async () => {
    vi.mocked(attendeeRepository.findAttendeeById).mockResolvedValue({
      data: {
        id: attendeeId,
        session_id: sessionId,
        student_id: studentA,
        status: ATTENDEE_STATUSES.PRESENT,
        note: null,
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(
      studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
    ).mockResolvedValue({
      data: { id: "grade-1", user_id: studentA, class_id: classId },
      error: null,
    } as never);

    const result = await updateAttendeeForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: attendeeId,
        class_id: classId,
        session_id: sessionId,
        status: ATTENDEE_STATUSES.ABSENT,
      }
    );

    expect(result).toEqual({
      success: false,
      error: STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
    });
    expect(attendeeRepository.updateAttendee).not.toHaveBeenCalled();
  });
});

describe("updateStudentTaskForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("updates student task fields", async () => {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: "2099-01-01T00:00:00.000Z",
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.updateStudentTask).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: "2026-07-11T10:00:00.000Z",
        grade: 18,
        notes: "Good work",
        graded_at: "2026-07-11T12:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ user_id: studentA, full_name: "Alice" }],
      error: null,
    } as never);
    mockAuthEmails([{ id: studentA, email: "alice@example.com" }]);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateStudentTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.GRADED,
        grade: 18,
        notes: "Good work",
        submitted_at: "2026-07-11T10:00",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.studentTask.status).toBe(STUDENT_TASK_STATUSES.GRADED);
      expect(result.studentTask.grade).toBe(18);
      expect(result.classId).toBe(classId);
      expect(result.sessionId).toBe(sessionId);
    }

    expect(studentTaskRepository.updateStudentTask).toHaveBeenCalledWith(
      adminClient,
      studentTaskId,
      expect.objectContaining({
        grade: 18,
        graded_at: expect.any(String),
      })
    );
  });

  it("promotes pending to graded when a grade is provided", async () => {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: "2099-01-01T00:00:00.000Z",
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.updateStudentTask).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: null,
        grade: 15,
        notes: null,
        graded_at: "2026-07-11T12:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ user_id: studentA, full_name: "Alice" }],
      error: null,
    } as never);
    mockAuthEmails([{ id: studentA, email: "alice@example.com" }]);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateStudentTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.PENDING,
        grade: 15,
      }
    );

    expect(result.success).toBe(true);
    expect(studentTaskRepository.updateStudentTask).toHaveBeenCalledWith(
      adminClient,
      studentTaskId,
      expect.objectContaining({
        status: STUDENT_TASK_STATUSES.GRADED,
        grade: 15,
      })
    );
  });

  it("promotes missing to late when a grade is provided", async () => {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.MISSING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: "2020-01-01T00:00:00.000Z",
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.updateStudentTask).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.LATE,
        submitted_at: null,
        grade: 14,
        notes: null,
        graded_at: "2026-07-11T12:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ user_id: studentA, full_name: "Alice" }],
      error: null,
    } as never);
    mockAuthEmails([{ id: studentA, email: "alice@example.com" }]);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateStudentTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.MISSING,
        grade: 14,
      }
    );

    expect(result.success).toBe(true);
    expect(studentTaskRepository.updateStudentTask).toHaveBeenCalledWith(
      adminClient,
      studentTaskId,
      expect.objectContaining({
        status: STUDENT_TASK_STATUSES.LATE,
        grade: 14,
      })
    );
  });

  it("demotes graded to pending when grade is cleared", async () => {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: null,
        grade: 18,
        notes: null,
        graded_at: "2026-07-11T12:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: "2099-01-01T00:00:00.000Z",
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.updateStudentTask).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ user_id: studentA, full_name: "Alice" }],
      error: null,
    } as never);
    mockAuthEmails([{ id: studentA, email: "alice@example.com" }]);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateStudentTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.GRADED,
        grade: "",
      }
    );

    expect(result.success).toBe(true);
    expect(studentTaskRepository.updateStudentTask).toHaveBeenCalledWith(
      adminClient,
      studentTaskId,
      expect.objectContaining({
        status: STUDENT_TASK_STATUSES.PENDING,
        grade: null,
        graded_at: null,
      })
    );
  });

  it("marks overdue pending work as missing when saved without a grade", async () => {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: "2020-01-01T00:00:00.000Z",
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.updateStudentTask).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.MISSING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ user_id: studentA, full_name: "Alice" }],
      error: null,
    } as never);
    mockAuthEmails([{ id: studentA, email: "alice@example.com" }]);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateStudentTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.PENDING,
        grade: "",
      }
    );

    expect(result.success).toBe(true);
    expect(studentTaskRepository.updateStudentTask).toHaveBeenCalledWith(
      adminClient,
      studentTaskId,
      expect.objectContaining({
        status: STUDENT_TASK_STATUSES.MISSING,
        grade: null,
      })
    );
  });

  it("rejects grade above task max", async () => {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: "2099-01-01T00:00:00.000Z",
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await updateStudentTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.GRADED,
        grade: 25,
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.grade?.[0]).toContain("20");
    }
  });

  it("blocks student task edits when that student has a computed grade", async () => {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentA,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: "2099-01-01T00:00:00.000Z",
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(
      studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
    ).mockResolvedValue({
      data: { id: "grade-1", user_id: studentA, class_id: classId },
      error: null,
    } as never);

    const result = await updateStudentTaskForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.GRADED,
        grade: 18,
      }
    );

    expect(result).toEqual({
      success: false,
      error: STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
    });
    expect(studentTaskRepository.updateStudentTask).not.toHaveBeenCalled();
  });
});

describe("seedLateJoinAttendeesForStudent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the late-join attendees RPC once", async () => {
    vi.mocked(attendeeRepository.seedLateJoinAttendees).mockResolvedValue({
      data: 2,
      error: null,
    } as never);

    await seedLateJoinAttendeesForStudent(adminClient, classId, studentA);

    expect(attendeeRepository.seedLateJoinAttendees).toHaveBeenCalledWith(
      adminClient,
      classId,
      studentA
    );
  });

  it("throws when the attendees RPC fails", async () => {
    vi.mocked(attendeeRepository.seedLateJoinAttendees).mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    } as never);

    await expect(
      seedLateJoinAttendeesForStudent(adminClient, classId, studentA)
    ).rejects.toThrow("insert failed");
  });
});

describe("seedLateJoinStudentTasksForStudent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the late-join student tasks RPC once", async () => {
    vi.mocked(studentTaskRepository.seedLateJoinStudentTasks).mockResolvedValue({
      data: 2,
      error: null,
    } as never);

    await seedLateJoinStudentTasksForStudent(adminClient, classId, studentA);

    expect(studentTaskRepository.seedLateJoinStudentTasks).toHaveBeenCalledWith(
      adminClient,
      classId,
      studentA
    );
  });

  it("throws when the student tasks RPC fails", async () => {
    vi.mocked(studentTaskRepository.seedLateJoinStudentTasks).mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    } as never);

    await expect(
      seedLateJoinStudentTasksForStudent(adminClient, classId, studentA)
    ).rejects.toThrow("insert failed");
  });
});

describe("seedLateJoinAttendeesForStudents", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the batch attendees RPC once", async () => {
    vi.mocked(
      attendeeRepository.seedLateJoinAttendeesForStudents
    ).mockResolvedValue({
      data: 4,
      error: null,
    } as never);

    await seedLateJoinAttendeesForStudents(adminClient, classId, [
      studentA,
      studentB,
    ]);

    expect(
      attendeeRepository.seedLateJoinAttendeesForStudents
    ).toHaveBeenCalledWith(adminClient, classId, [studentA, studentB]);
  });
});

describe("seedLateJoinStudentTasksForStudents", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the batch student tasks RPC once", async () => {
    vi.mocked(
      studentTaskRepository.seedLateJoinStudentTasksForStudents
    ).mockResolvedValue({
      data: 4,
      error: null,
    } as never);

    await seedLateJoinStudentTasksForStudents(adminClient, classId, [
      studentA,
      studentB,
    ]);

    expect(
      studentTaskRepository.seedLateJoinStudentTasksForStudents
    ).toHaveBeenCalledWith(adminClient, classId, [studentA, studentB]);
  });
});

describe("ensureSessionAttendeesForMembers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the member attendees RPC once", async () => {
    vi.mocked(
      attendeeRepository.ensureSessionAttendeesForMembers
    ).mockResolvedValue({
      data: 2,
      error: null,
    } as never);

    await ensureSessionAttendeesForMembers(adminClient, sessionId, classId);

    expect(
      attendeeRepository.ensureSessionAttendeesForMembers
    ).toHaveBeenCalledWith(adminClient, sessionId, classId);
    expect(attendeeRepository.createAttendees).not.toHaveBeenCalled();
    expect(attendeeRepository.listAttendeesBySessionId).not.toHaveBeenCalled();
  });

  it("throws when the member attendees RPC fails", async () => {
    vi.mocked(
      attendeeRepository.ensureSessionAttendeesForMembers
    ).mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    } as never);

    await expect(
      ensureSessionAttendeesForMembers(adminClient, sessionId, classId)
    ).rejects.toThrow("insert failed");
  });
});

describe("deleteClassSessionForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
  });

  it("rejects non-managers", async () => {
    const result = await deleteClassSessionForManager(
      adminClient,
      null,
      actor,
      sessionId
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(sessionRepository.deleteSessionById).not.toHaveBeenCalled();
  });

  it("blocks delete when computed course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 1, error: null } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);

    const result = await deleteClassSessionForManager(
      adminClient,
      actor.userId,
      actor,
      sessionId
    );

    expect(result).toEqual({
      success: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
    expect(sessionRepository.deleteSessionById).not.toHaveBeenCalled();
  });

  it("blocks delete when session difficulty is set", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: {
        ...sessionRecord,
        group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
      },
      error: null,
    } as never);

    const result = await deleteClassSessionForManager(
      adminClient,
      actor.userId,
      actor,
      sessionId
    );

    expect(result).toEqual({
      success: false,
      error: "Clear the session difficulty before deleting.",
    });
    expect(sessionRepository.deleteSessionById).not.toHaveBeenCalled();
  });

  it("blocks delete when the session has tasks", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(taskRepository.listTasksBySessionId).mockResolvedValue({
      data: [{ id: taskId, session_id: sessionId, title: "Homework" }],
      error: null,
    } as never);

    const result = await deleteClassSessionForManager(
      adminClient,
      actor.userId,
      actor,
      sessionId
    );

    expect(result).toEqual({
      success: false,
      error: "Delete or reassign session tasks before deleting the session.",
    });
    expect(sessionRepository.deleteSessionById).not.toHaveBeenCalled();
  });

  it("deletes the session, renumbers remaining sessions, and audits", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: { ...sessionRecord, nb_order: 2 },
      error: null,
    } as never);
    vi.mocked(taskRepository.listTasksBySessionId).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(sessionRepository.deleteSessionById).mockResolvedValue({
      error: null,
    } as never);
    vi.mocked(sessionRepository.renumberSessionsAfterDelete).mockResolvedValue({
      data: 1,
      error: null,
    } as never);

    const result = await deleteClassSessionForManager(
      adminClient,
      actor.userId,
      actor,
      sessionId
    );

    expect(result).toEqual({
      success: true,
      message: "Session deleted.",
      classId,
    });
    expect(sessionRepository.deleteSessionById).toHaveBeenCalledWith(
      adminClient,
      sessionId
    );
    expect(sessionRepository.renumberSessionsAfterDelete).toHaveBeenCalledWith(
      adminClient,
      classId
    );
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "delete",
        severity: "critical",
        table_name: "sessions",
        record_id: sessionId,
      })
    );
  });

  it("renumbers later sessions when the first session is deleted", async () => {
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: sessionRecord,
      error: null,
    } as never);
    vi.mocked(taskRepository.listTasksBySessionId).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(sessionRepository.deleteSessionById).mockResolvedValue({
      error: null,
    } as never);
    vi.mocked(sessionRepository.renumberSessionsAfterDelete).mockResolvedValue({
      data: 2,
      error: null,
    } as never);

    const result = await deleteClassSessionForManager(
      adminClient,
      actor.userId,
      actor,
      sessionId
    );

    expect(result.success).toBe(true);
    expect(sessionRepository.renumberSessionsAfterDelete).toHaveBeenCalledWith(
      adminClient,
      classId
    );
  });
});
