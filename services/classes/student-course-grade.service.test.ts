import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATTENDEE_STATUSES } from "@/lib/constants/manager-attendee-status";
import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { SESSION_GROUP_GRADE_LEVELS } from "@/types/manager-session-group-grade";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import * as classService from "@/services/classes/class.service";
import {
  getStudentClassGradeDetailForManager,
  listComputedStudentGradeSheetBundlesForManager,
} from "@/services/classes/student-course-grade.service";

vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-course-grade.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/task.repository");
vi.mock("@/services/classes/class.service", () => ({
  assertClassGradesUnlockedForManager: vi.fn(),
  listClassStudentsForManager: vi.fn(),
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
const actorUserId = "11111111-1111-4111-8111-111111111111";

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sessionOneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const sessionTwoId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const taskOneId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const studentProfileId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const studentUserId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const finalExamId = "11111111-1111-4111-8111-111111111111";

const classRow = {
  id: classId,
  name: "Robotics A",
  subject_id: "subject-1",
  subject_name: "Robotics",
  semester_id: "semester-1",
  semester_name: "Fall 2026",
  status: "completed",
  nb_sessions: 2,
  nb_students: 1,
  created_at: "2026-01-01T00:00:00.000Z",
};

const enrolledStudent = {
  id: "enrollment-1",
  student_profile_id: studentProfileId,
  user_id: studentUserId,
  full_name: "Sara Ahmed",
  username: "sara",
  email: "sara@example.com",
  phone: null,
  joined_at: "2026-02-01T00:00:00.000Z",
};

const sessionRecords = [
  {
    id: sessionOneId,
    class_id: classId,
    nb_order: 1,
    topic: "Intro",
    session_report: null,
    starts_at: "2026-07-10T10:00:00.000Z",
    ends_at: "2026-07-10T12:00:00.000Z",
    semester_id: null,
    group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
    created_at: "2026-07-01T00:00:00.000Z",
  },
  {
    id: sessionTwoId,
    class_id: classId,
    nb_order: 2,
    topic: "Practice",
    session_report: null,
    starts_at: "2026-07-17T10:00:00.000Z",
    ends_at: "2026-07-17T12:00:00.000Z",
    semester_id: null,
    group_grade_level: null,
    created_at: "2026-07-02T00:00:00.000Z",
  },
];

function mockGradeContext(options?: {
  storedGrade?: Record<string, unknown> | null;
  studentTaskGrade?: number | null;
}) {
  vi.mocked(sessionRepository.listSessionsByClassId).mockResolvedValue({
    data: sessionRecords,
    error: null,
  } as never);

  vi.mocked(taskRepository.listTasksForGradesBySessionIds).mockResolvedValue({
    data: [
      {
        id: taskOneId,
        session_id: sessionOneId,
        title: "Worksheet 1",
        max_grade: 20,
        due_date: "2026-07-11T00:00:00.000Z",
        created_at: "2026-07-01T00:00:00.000Z",
      },
    ],
    error: null,
  } as never);

  vi.mocked(finalExamRepository.findFinalExamByClassId).mockResolvedValue({
    data: {
      id: finalExamId,
      class_id: classId,
      title: "Final exam",
      description: null,
      due_date: "2026-08-01T00:00:00.000Z",
      max_grade: 100,
      created_at: "2026-07-10T00:00:00.000Z",
    },
    error: null,
  } as never);

  vi.mocked(studentCourseGradeRepository.listStudentCourseGradesByClassId).mockResolvedValue({
    data: options?.storedGrade ? [options.storedGrade] : [],
    error: null,
  } as never);

  vi.mocked(studentTaskRepository.listStudentTasksForGradesByTaskIds).mockResolvedValue({
    data: [
      {
        id: "student-task-1",
        task_id: taskOneId,
        student_id: studentUserId,
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: "2026-07-11T10:00:00.000Z",
        grade: options?.studentTaskGrade ?? 18,
        notes: null,
        graded_at: "2026-07-11T12:00:00.000Z",
      },
    ],
    error: null,
  } as never);

  vi.mocked(finalExamRepository.listStudentFinalExamGradesByFinalExamId).mockResolvedValue({
    data: [
      {
        id: "final-grade-1",
        final_exam_id: finalExamId,
        student_id: studentUserId,
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: null,
        grade: 85,
        notes: null,
        graded_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ],
    error: null,
  } as never);

  vi.mocked(attendeeRepository.listAttendeesBySessionIds).mockResolvedValue({
    data: [
      {
        session_id: sessionOneId,
        student_id: studentUserId,
        status: ATTENDEE_STATUSES.PRESENT,
      },
      {
        session_id: sessionTwoId,
        student_id: studentUserId,
        status: ATTENDEE_STATUSES.ABSENT,
      },
    ],
    error: null,
  } as never);
}

describe("getStudentClassGradeDetailForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(classService.assertClassGradesUnlockedForManager).mockResolvedValue({
      ok: true,
      classRow,
    });

    vi.mocked(classService.listClassStudentsForManager).mockResolvedValue([
      enrolledStudent,
    ]);
  });

  it("returns null when the student is not enrolled", async () => {
    mockGradeContext();

    const result = await getStudentClassGradeDetailForManager(
      adminClient,
      actorUserId,
      classId,
      "99999999-9999-4999-8999-999999999999"
    );

    expect(result).toBeNull();
  });

  it("throws when grades are locked", async () => {
    vi.mocked(classService.assertClassGradesUnlockedForManager).mockResolvedValue({
      ok: false,
      error: "Grades are locked for this class.",
    });

    await expect(
      getStudentClassGradeDetailForManager(
        adminClient,
        actorUserId,
        classId,
        studentProfileId
      )
    ).rejects.toThrow("Grades are locked for this class.");
  });

  it("returns pending grade detail with attendance and tasks", async () => {
    mockGradeContext();

    const result = await getStudentClassGradeDetailForManager(
      adminClient,
      actorUserId,
      classId,
      studentProfileId
    );

    expect(result).not.toBeNull();
    expect(result?.student.full_name).toBe("Sara Ahmed");
    expect(result?.gradeRow.is_computed).toBe(false);
    expect(result?.gradeRow.task_total_grade).toBe(90);
    expect(result?.gradeRow.final_exam_grade).toBe(85);
    expect(result?.detail.courseGrade).toBeNull();
    expect(result?.detail.groupGradeSlots).toEqual([
      expect.objectContaining({
        session_id: sessionOneId,
        session_label: "S1",
        group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
        group_grade_label: "Medium",
        group_grade_index: 2,
      }),
    ]);
    expect(result?.detail.attendanceSlots).toEqual([
      expect.objectContaining({
        session_id: sessionOneId,
        session_label: "S1",
        status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
      }),
      expect.objectContaining({
        session_id: sessionTwoId,
        session_label: "S2",
        status: STUDENT_ATTENDANCE_STATUSES.ABSENT,
      }),
    ]);
    expect(result?.detail.tasks).toHaveLength(1);
    expect(result?.detail.tasks[0]).toMatchObject({
      task_id: taskOneId,
      title: "Worksheet 1",
      grade: 18,
      status: STUDENT_TASK_STATUSES.GRADED,
    });
    expect(result?.classTasks).toHaveLength(1);
    expect(result?.finalExam?.title).toBe("Final exam");
  });

  it("returns stored course grade json when a computed row exists", async () => {
    mockGradeContext({
      storedGrade: {
        id: "grade-1",
        user_id: studentUserId,
        class_id: classId,
        task_json_grade_weights: [{ key: taskOneId, label: "Worksheet 1", weight: 100 }],
        group_grades_json: [
          { session_id: sessionOneId, session_label: "S1", grade: 88 },
        ],
        attendee_grades_json: [
          { session_id: sessionOneId, session_label: "S1", grade: 90, status: "present" },
        ],
        task_weight: 60,
        task_total_grade: 18,
        final_exam_grade: 85,
        final_exam_weight: 40,
        type: "final",
        created_at: "2026-08-02T00:00:00.000Z",
      },
    });

    const result = await getStudentClassGradeDetailForManager(
      adminClient,
      actorUserId,
      classId,
      studentProfileId
    );

    expect(result?.gradeRow.is_computed).toBe(true);
    expect(result?.gradeRow.total_grade).toBeCloseTo(44.8, 1);
    expect(result?.detail.courseGrade).toMatchObject({
      id: "grade-1",
      task_total_grade: 18,
      final_exam_grade: 85,
      final_exam_weight: 40,
    });
    expect(result?.detail.courseGrade?.group_grades_json).toEqual([
      { session_id: sessionOneId, session_label: "S1", grade: 88 },
    ]);
    expect(result?.detail.groupGradeSlots).toEqual([
      expect.objectContaining({
        session_id: sessionOneId,
        group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
      }),
    ]);
  });

  it("includes orphan tasks without a session as Unassigned", async () => {
    const orphanTaskId = "22222222-2222-4222-8222-222222222222";

    mockGradeContext();
    vi.mocked(taskRepository.listTasksForGradesBySessionIds).mockResolvedValue({
      data: [
        {
          id: taskOneId,
          session_id: sessionOneId,
          title: "Worksheet 1",
          max_grade: 20,
          due_date: "2026-07-11T00:00:00.000Z",
          created_at: "2026-07-01T00:00:00.000Z",
        },
        {
          id: orphanTaskId,
          session_id: null,
          title: "Legacy orphan",
          max_grade: 100,
          due_date: null,
          created_at: "2026-07-03T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    vi.mocked(studentTaskRepository.listStudentTasksForGradesByTaskIds).mockResolvedValue({
      data: [
        {
          id: "student-task-1",
          task_id: taskOneId,
          student_id: studentUserId,
          status: STUDENT_TASK_STATUSES.GRADED,
          submitted_at: "2026-07-11T10:00:00.000Z",
          grade: 18,
          notes: null,
          graded_at: "2026-07-11T12:00:00.000Z",
        },
        {
          id: "student-task-orphan",
          task_id: orphanTaskId,
          student_id: studentUserId,
          status: STUDENT_TASK_STATUSES.MISSING,
          submitted_at: null,
          grade: 0,
          notes: null,
          graded_at: null,
        },
      ],
      error: null,
    } as never);

    const result = await getStudentClassGradeDetailForManager(
      adminClient,
      actorUserId,
      classId,
      studentProfileId
    );

    expect(result?.classTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: orphanTaskId,
          session_id: null,
          session_label: "Unassigned",
        }),
      ])
    );
    expect(result?.gradeRow.missing_items).toEqual([]);
    expect(result?.gradeRow.task_total_grade).toBe(45);
  });
});

describe("listComputedStudentGradeSheetBundlesForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(classService.assertClassGradesUnlockedForManager).mockResolvedValue({
      ok: true,
      classRow: {
        id: classId,
        name: "Robotics A",
        subject_id: "subject-1",
        subject_name: "Robotics",
        subject_nb_sessions: 2,
        completed_sessions: 2,
        status: "completed",
        semester_id: "semester-1",
        semester_name: "Fall 2026",
        enrollment_count: 2,
        teacher_count: 1,
        image_url: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  it("returns only computed student bundles", async () => {
    mockGradeContext({
      storedGrade: {
        id: "grade-1",
        user_id: studentUserId,
        class_id: classId,
        task_json_grade_weights: [{ key: taskOneId, label: "Worksheet 1", weight: 100 }],
        group_grades_json: [],
        attendee_grades_json: [],
        task_weight: 60,
        task_total_grade: 18,
        final_exam_grade: 85,
        final_exam_weight: 40,
        type: "final",
        created_at: "2026-08-02T00:00:00.000Z",
      },
    });

    vi.mocked(classService.listClassStudentsForManager).mockResolvedValue([
      enrolledStudent,
      {
        ...enrolledStudent,
        id: "enrollment-2",
        student_profile_id: "99999999-9999-4999-8999-999999999999",
        user_id: "88888888-8888-4888-8888-888888888888",
        full_name: "Pending Student",
      },
    ]);

    const result = await listComputedStudentGradeSheetBundlesForManager(
      adminClient,
      actorUserId,
      classId
    );

    expect(result.bundles).toHaveLength(1);
    expect(result.bundles[0]?.student.full_name).toBe("Sara Ahmed");
    expect(result.bundles[0]?.gradeRow.is_computed).toBe(true);
    expect(result.classRow.name).toBe("Robotics A");
  });

  it("returns an empty bundle list when no students are computed", async () => {
    mockGradeContext();
    vi.mocked(classService.listClassStudentsForManager).mockResolvedValue([
      enrolledStudent,
    ]);

    const result = await listComputedStudentGradeSheetBundlesForManager(
      adminClient,
      actorUserId,
      classId
    );

    expect(result.bundles).toEqual([]);
  });
});
