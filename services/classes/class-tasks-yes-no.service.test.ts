import { beforeEach, describe, expect, it, vi } from "vitest";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { ROLES } from "@/lib/constants/roles";
import {
  YES_NO_LOCKED_MESSAGE,
  YES_NO_MAX_GRADE,
} from "@/lib/constants/task-yes-no";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createClassTaskForManager,
  updateClassTaskForManager,
  updateStudentTaskForManager,
} from "@/services/classes/class-tasks.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-task.repository");
vi.mock("@/repositories/student-course-grade.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/services/classes/student-task-upload.service", () => ({
  removeStorageForStudentTaskUploads: vi.fn().mockResolvedValue({ error: null }),
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

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const taskId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const studentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const studentTaskId = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";

function buildTaskRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: taskId,
    class_id: classId,
    source_subject_task_id: null,
    title: "Attendance check",
    description: null,
    period: 7,
    max_grade: 20,
    is_yes_no: false,
    sort_order: 0,
    started: false,
    started_at: null,
    due_date: null,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(
    studentCourseGradeRepository.countStudentCourseGradesByClassId
  ).mockResolvedValue({ count: 0, error: null } as never);
  vi.mocked(
    studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
  ).mockResolvedValue({ data: null, error: null } as never);
});

describe("createClassTaskForManager (Yes/No)", () => {
  it("forces max grade to 100 for Yes/No tasks", async () => {
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: { id: classId, name: "Robotics A" },
      error: null,
    } as never);
    vi.mocked(classTaskRepository.listClassTasksByClassId).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(classTaskRepository.createClassTask).mockResolvedValue({
      data: buildTaskRecord({ is_yes_no: true, max_grade: YES_NO_MAX_GRADE }),
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.seedStudentTasksForNewTask).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await createClassTaskForManager(adminClient, actor.userId, actor, {
      class_id: classId,
      title: "Attendance check",
      period: 7,
      max_grade: 20,
      is_yes_no: true,
    });

    expect(result.success).toBe(true);
    expect(classTaskRepository.createClassTask).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ is_yes_no: true, max_grade: YES_NO_MAX_GRADE })
    );
  });
});

describe("updateClassTaskForManager (Yes/No lock)", () => {
  it("rejects changing Yes/No once a student has a grade", async () => {
    vi.mocked(classTaskRepository.findClassTaskById).mockResolvedValue({
      data: buildTaskRecord(),
      error: null,
    } as never);
    vi.mocked(
      studentTaskRepository.countGradedStudentTasksByTaskId
    ).mockResolvedValue({ count: 2, error: null } as never);

    const result = await updateClassTaskForManager(adminClient, actor.userId, actor, {
      id: taskId,
      class_id: classId,
      title: "Attendance check",
      period: 7,
      max_grade: 20,
      is_yes_no: true,
      sort_order: 0,
    });

    expect(result).toEqual({ success: false, error: YES_NO_LOCKED_MESSAGE });
    expect(classTaskRepository.updateClassTaskById).not.toHaveBeenCalled();
  });

  it("allows switching to Yes/No before any grades and forces max 100", async () => {
    vi.mocked(classTaskRepository.findClassTaskById).mockResolvedValue({
      data: buildTaskRecord(),
      error: null,
    } as never);
    vi.mocked(
      studentTaskRepository.countGradedStudentTasksByTaskId
    ).mockResolvedValue({ count: 0, error: null } as never);
    vi.mocked(classTaskRepository.updateClassTaskById).mockResolvedValue({
      data: buildTaskRecord({ is_yes_no: true, max_grade: YES_NO_MAX_GRADE }),
      error: null,
    } as never);

    const result = await updateClassTaskForManager(adminClient, actor.userId, actor, {
      id: taskId,
      class_id: classId,
      title: "Attendance check",
      period: 7,
      max_grade: 20,
      is_yes_no: true,
      sort_order: 0,
    });

    expect(result.success).toBe(true);
    expect(classTaskRepository.updateClassTaskById).toHaveBeenCalledWith(
      adminClient,
      taskId,
      expect.objectContaining({ is_yes_no: true, max_grade: YES_NO_MAX_GRADE })
    );
    expect(studentTaskRepository.clampStudentTaskGradesAboveMax).not.toHaveBeenCalled();
  });

  it("does not check grades when the Yes/No setting is unchanged", async () => {
    vi.mocked(classTaskRepository.findClassTaskById).mockResolvedValue({
      data: buildTaskRecord({ is_yes_no: true, max_grade: YES_NO_MAX_GRADE }),
      error: null,
    } as never);
    vi.mocked(classTaskRepository.updateClassTaskById).mockResolvedValue({
      data: buildTaskRecord({
        is_yes_no: true,
        max_grade: YES_NO_MAX_GRADE,
        title: "Renamed",
      }),
      error: null,
    } as never);

    const result = await updateClassTaskForManager(adminClient, actor.userId, actor, {
      id: taskId,
      class_id: classId,
      title: "Renamed",
      period: 7,
      max_grade: "",
      is_yes_no: true,
      sort_order: 0,
    });

    expect(result.success).toBe(true);
    expect(
      studentTaskRepository.countGradedStudentTasksByTaskId
    ).not.toHaveBeenCalled();
    expect(classTaskRepository.updateClassTaskById).toHaveBeenCalledWith(
      adminClient,
      taskId,
      expect.objectContaining({ max_grade: YES_NO_MAX_GRADE })
    );
  });
});

describe("updateStudentTaskForManager (Yes/No grades)", () => {
  function mockYesNoStudentTask() {
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentId,
        status: STUDENT_TASK_STATUSES.PENDING,
        submitted_at: null,
        grade: null,
        notes: null,
        student_report: null,
        graded_at: null,
      },
      error: null,
    } as never);
    vi.mocked(classTaskRepository.findClassTaskById).mockResolvedValue({
      data: buildTaskRecord({
        is_yes_no: true,
        max_grade: YES_NO_MAX_GRADE,
        due_date: "2099-01-01T00:00:00.000Z",
      }),
      error: null,
    } as never);
  }

  it("rejects grades other than Yes (100) or No (0)", async () => {
    mockYesNoStudentTask();

    const result = await updateStudentTaskForManager(adminClient, actor.userId, actor, {
      id: studentTaskId,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 50,
    });

    expect(result.success).toBe(false);
    expect(studentTaskRepository.updateStudentTask).not.toHaveBeenCalled();
  });

  it("saves No as grade 0 and marks the task graded", async () => {
    mockYesNoStudentTask();
    vi.mocked(studentTaskRepository.updateStudentTask).mockResolvedValue({
      data: {
        id: studentTaskId,
        task_id: taskId,
        student_id: studentId,
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: null,
        grade: 0,
        notes: null,
        student_report: null,
        graded_at: "2026-07-11T12:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesByUserIds
    ).mockResolvedValue({
      data: [{ user_id: studentId, full_name: "Alice" }],
      error: null,
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([[studentId, "alice@example.com"]]),
      error: null,
    });

    const result = await updateStudentTaskForManager(adminClient, actor.userId, actor, {
      id: studentTaskId,
      status: STUDENT_TASK_STATUSES.PENDING,
      grade: 0,
    });

    expect(result.success).toBe(true);
    expect(studentTaskRepository.updateStudentTask).toHaveBeenCalledWith(
      adminClient,
      studentTaskId,
      expect.objectContaining({
        grade: 0,
        status: STUDENT_TASK_STATUSES.GRADED,
      })
    );
  });
});
