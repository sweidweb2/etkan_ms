import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATTENDEE_STATUSES } from "@/lib/constants/manager-attendee-status";
import { LATE_ENROLLMENT_NOTE } from "@/lib/constants/manager-late-enrollment";
import { ROLES } from "@/lib/constants/roles";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createSessionTaskForManager,
  getSessionDetailForManager,
  seedLateJoinAttendeesForStudent,
  updateAttendeeForManager,
  updateSessionSettingsForManager,
  updateStudentTaskForManager,
} from "@/services/session.service";
import { SESSION_GROUP_GRADE_LEVELS } from "@/types/manager-session-group-grade";

vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/task.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
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
  vi.mocked(authRepository.getAuthUserById).mockImplementation(
    async (_client, userId) => {
      const match = entries.find((entry) => entry.id === userId);
      return {
        data: { user: match ? { email: match.email } : null },
        error: null,
      } as never;
    }
  );
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
      getSessionDetailForManager(adminClient, ROLES.TEACHER, classId, sessionId)
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
      ROLES.MANAGER,
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
      studentClassRepository.listEnrolledUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: studentA }, { user_id: studentB }],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.listAttendeesBySessionId)
      .mockResolvedValueOnce({
        data: [
          {
            id: attendeeId,
            session_id: sessionId,
            student_id: studentA,
            status: ATTENDEE_STATUSES.PRESENT,
            note: null,
            created_at: "2026-07-10T00:00:00.000Z",
          },
        ],
        error: null,
      } as never)
      .mockResolvedValueOnce({
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
    vi.mocked(attendeeRepository.createAttendees).mockResolvedValue({
      data: [],
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
      ROLES.MANAGER,
      classId,
      sessionId
    );

    expect(attendeeRepository.createAttendees).toHaveBeenCalledWith(
      adminClient,
      [
        {
          session_id: sessionId,
          student_id: studentB,
          status: ATTENDEE_STATUSES.PRESENT,
          note: null,
        },
      ]
    );
    expect(result?.session.id).toBe(sessionId);
    expect(result?.attendees).toHaveLength(2);
    expect(result?.phaseOptions).toEqual([
      { phase_id: semesterId, phase_name: "Fall 2026" },
    ]);
  });
});

describe("updateSessionSettingsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects non-managers", async () => {
    const result = await updateSessionSettingsForManager(
      adminClient,
      ROLES.TEACHER,
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
      ROLES.MANAGER,
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
      ROLES.MANAGER,
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
});

describe("createSessionTaskForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("creates pending student_tasks for enrolled students", async () => {
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
    vi.mocked(
      studentClassRepository.listEnrolledUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: studentA }, { user_id: studentB }],
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.createStudentTasks).mockResolvedValue({
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

    const result = await createSessionTaskForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        class_id: classId,
        session_id: sessionId,
        title: "Homework 1",
        max_grade: 20,
      }
    );

    expect(studentTaskRepository.createStudentTasks).toHaveBeenCalledWith(
      adminClient,
      [
        {
          task_id: taskId,
          student_id: studentA,
          status: STUDENT_TASK_STATUSES.PENDING,
        },
        {
          task_id: taskId,
          student_id: studentB,
          status: STUDENT_TASK_STATUSES.PENDING,
        },
      ]
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.title).toBe("Homework 1");
      expect(result.studentTasks).toHaveLength(2);
      expect(result.studentTasks.every((row) => row.status === "pending")).toBe(
        true
      );
    }
  });
});

describe("updateAttendeeForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
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
      ROLES.MANAGER,
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
});

describe("updateStudentTaskForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
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

    const result = await updateStudentTaskForManager(
      adminClient,
      ROLES.MANAGER,
      actor,
      {
        id: studentTaskId,
        status: STUDENT_TASK_STATUSES.GRADED,
        grade: 18,
        notes: "Good work",
        submitted_at: "2026-07-11T10:00",
        graded_at: "2026-07-11T12:00",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.studentTask.status).toBe(STUDENT_TASK_STATUSES.GRADED);
      expect(result.studentTask.grade).toBe(18);
    }
  });
});

describe("seedLateJoinAttendeesForStudent", () => {
  const sessionTwoId = "c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates absent rows with late-join note for sessions without the student", async () => {
    vi.mocked(sessionRepository.listSessionIdsByClassId).mockResolvedValue({
      data: [
        { id: sessionId, nb_order: 1, topic: "Intro" },
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

    await seedLateJoinAttendeesForStudent(adminClient, classId, studentA);

    expect(attendeeRepository.createAttendees).toHaveBeenCalledWith(
      adminClient,
      [
        {
          session_id: sessionId,
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
    vi.mocked(sessionRepository.listSessionIdsByClassId).mockResolvedValue({
      data: [
        { id: sessionId, nb_order: 1, topic: "Intro" },
        { id: sessionTwoId, nb_order: 2, topic: "Sensors" },
      ],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.listAttendeesBySessionIds).mockResolvedValue({
      data: [{ session_id: sessionId, student_id: studentA, status: ATTENDEE_STATUSES.PRESENT }],
      error: null,
    } as never);
    vi.mocked(attendeeRepository.createAttendees).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    await seedLateJoinAttendeesForStudent(adminClient, classId, studentA);

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

  it("does nothing when the class has no sessions", async () => {
    vi.mocked(sessionRepository.listSessionIdsByClassId).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    await seedLateJoinAttendeesForStudent(adminClient, classId, studentA);

    expect(attendeeRepository.createAttendees).not.toHaveBeenCalled();
  });
});
