import { beforeEach, describe, expect, it, vi } from "vitest";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";
import {
  findStudentClassMembership,
  getStudentClassDetailForSelf,
  getStudentClassTaskForSelf,
  listJoinedClassesForSelf,
} from "@/services/classes/student-class-self.service";
import * as studentCourseGradeService from "@/services/classes/student-course-grade.service";
import * as studentService from "@/services/students/student.service";

vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/student-task-upload.repository");
vi.mock("@/repositories/class-task.repository");
vi.mock("@/services/classes/student-course-grade.service", () => ({
  listStudentClassAcademicBundlesForSelf: vi.fn(),
}));
vi.mock("@/services/students/student.service", () => ({
  listJoinedClassesForStudentSelf: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  assertStudentSelfAccess: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
    return userId;
  }),
}));

const adminClient = {} as never;
const studentUserId = "student-1";
const classId = "class-1";
const taskId = "task-1";
const sessionId = "session-1";

const classRow = {
  id: "enrollment-1",
  class_id: classId,
  name: "Math A",
  subject_name: "Mathematics",
  class_status: "in_progress" as const,
  joined_at: "2026-09-01T00:00:00.000Z",
};

describe("findStudentClassMembership", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns true when enrolled", async () => {
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: { id: "e1", user_id: studentUserId, class_id: classId },
      error: null,
    } as never);

    await expect(
      findStudentClassMembership(adminClient, studentUserId, classId)
    ).resolves.toBe(true);
  });

  it("returns false when not enrolled", async () => {
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(
      findStudentClassMembership(adminClient, studentUserId, classId)
    ).resolves.toBe(false);
  });
});

describe("listJoinedClassesForSelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
    });
  });

  it("requires classes.view and returns joined classes", async () => {
    vi.mocked(studentService.listJoinedClassesForStudentSelf).mockResolvedValue(
      [classRow]
    );

    const rows = await listJoinedClassesForSelf(adminClient, studentUserId);

    expect(assertPermission).toHaveBeenCalled();
    expect(rows).toEqual([classRow]);
  });

  it("rejects unauthenticated callers", async () => {
    await expect(listJoinedClassesForSelf(adminClient, null)).rejects.toThrow(
      "Unauthorized."
    );
  });
});

describe("getStudentClassDetailForSelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
    });
    vi.mocked(assertStudentSelfAccess).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
      return userId as string;
    });
  });

  it("returns null when not a class member", async () => {
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({ data: null, error: null } as never);

    const detail = await getStudentClassDetailForSelf(
      adminClient,
      studentUserId,
      classId
    );

    expect(detail).toBeNull();
  });

  it("returns class detail with classmates excluding self", async () => {
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: { id: "e1", user_id: studentUserId, class_id: classId },
      error: null,
    } as never);
    vi.mocked(studentService.listJoinedClassesForStudentSelf).mockResolvedValue(
      [classRow]
    );
    vi.mocked(
      studentCourseGradeService.listStudentClassAcademicBundlesForSelf
    ).mockResolvedValue([
      {
        classRow,
        detail: {
          attendanceSlots: [],
          attendanceTrend: [],
          groupGradeSlots: [],
          tasks: [],
          taskGradeTrend: [],
          courseGrade: null,
        },
        finalExam: {
          id: "fe-1",
          class_id: classId,
          title: "Final",
          description: null,
          max_grade: 100,
          due_date: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
        studentFinalExamGrade: {
          id: "feg-1",
          final_exam_id: "fe-1",
          student_id: studentUserId,
          full_name: "Student One",
          status: "graded",
          submitted_at: null,
          grade: 90,
          notes: null,
          graded_at: "2026-09-20T00:00:00.000Z",
          created_at: "2026-09-01T00:00:00.000Z",
        },
      },
    ]);
    vi.mocked(sessionRepository.listSessionsByClassId).mockResolvedValue({
      data: [
        {
          id: sessionId,
          class_id: classId,
          nb_order: 1,
          topic: "Intro",
          session_report: null,
          starts_at: "2026-09-01T10:00:00.000Z",
          ends_at: "2026-09-01T12:00:00.000Z",
          semester_id: null,
          group_grade_level: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.listStudentClassesByClassId
    ).mockResolvedValue({
      data: [
        { id: "e1", user_id: studentUserId, class_id: classId },
        { id: "e2", user_id: "student-2", class_id: classId },
      ],
      error: null,
    } as never);
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [{ id: "student-2", username: "peer" }],
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [{ user_id: "student-2", full_name: "Peer Student", id: "sp2" }],
      error: null,
    } as never);
    vi.mocked(
      studentTaskUploadRepository.listStudentTaskUploadsByStudentTaskIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const detail = await getStudentClassDetailForSelf(
      adminClient,
      studentUserId,
      classId
    );

    expect(detail).not.toBeNull();
    expect(detail?.sessions).toHaveLength(1);
    expect(detail?.classmates).toEqual([
      { full_name: "Peer Student", username: "peer" },
    ]);
    expect(detail?.finalExam?.title).toBe("Final");
    expect(detail?.studentFinalExamGrade?.grade).toBe(90);
    expect(detail?.uploads).toEqual([]);
  });
});

describe("getStudentClassTaskForSelf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
    });
    vi.mocked(assertStudentSelfAccess).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
      return userId as string;
    });
  });

  it("returns null when task session belongs to another class", async () => {
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: { id: "e1", user_id: studentUserId, class_id: classId },
      error: null,
    } as never);
    vi.mocked(studentService.listJoinedClassesForStudentSelf).mockResolvedValue(
      [classRow]
    );
    vi.mocked(classTaskRepository.findClassTaskById).mockResolvedValue({
      data: {
        id: taskId,
        class_id: "other-class",
        started: true,
        title: "Homework",
        description: null,
        due_date: null,
        max_grade: 100,
        created_at: "2026-09-01T00:00:00.000Z",
      },
      error: null,
    } as never);

    const detail = await getStudentClassTaskForSelf(
      adminClient,
      studentUserId,
      classId,
      taskId
    );

    expect(detail).toBeNull();
  });

  it("returns task with own grade only", async () => {
    vi.mocked(
      studentClassRepository.findStudentClassByUserAndClass
    ).mockResolvedValue({
      data: { id: "e1", user_id: studentUserId, class_id: classId },
      error: null,
    } as never);
    vi.mocked(studentService.listJoinedClassesForStudentSelf).mockResolvedValue(
      [classRow]
    );
    vi.mocked(classTaskRepository.findClassTaskById).mockResolvedValue({
      data: {
        id: taskId,
        class_id: classId,
        started: true,
        title: "Homework",
        description: "Do the work",
        due_date: "2026-09-10",
        max_grade: 100,
        created_at: "2026-09-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(
      studentTaskRepository.listStudentTasksForGradesByTaskIdsAndStudentId
    ).mockResolvedValue({
      data: [
        {
          id: "st-1",
          task_id: taskId,
          student_id: studentUserId,
          status: "graded",
          grade: 88,
          submitted_at: "2026-09-09T00:00:00.000Z",
          graded_at: "2026-09-11T00:00:00.000Z",
          notes: null,
        },
      ],
      error: null,
    } as never);
    vi.mocked(
      studentTaskUploadRepository.listStudentTaskUploadsByStudentTaskIds
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const detail = await getStudentClassTaskForSelf(
      adminClient,
      studentUserId,
      classId,
      taskId
    );

    expect(detail?.task.title).toBe("Homework");
    expect(detail?.task.session_label).toBeNull();
    expect(detail?.task.started).toBe(true);
    expect(detail?.studentTask?.grade).toBe(88);
    expect(detail?.studentTask?.id).toBe("st-1");
    expect(detail?.uploads).toEqual([]);
    expect(
      studentTaskRepository.listStudentTasksForGradesByTaskIdsAndStudentId
    ).toHaveBeenCalledWith(adminClient, [taskId], studentUserId);
  });
});
