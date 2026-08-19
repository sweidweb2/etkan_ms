import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
  STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
} from "@/lib/manager/class-grades-access";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import {
  assertClassStructureUnlockedForComputedGrades,
  assertStudentGradeInputsUnlockedForComputedGrade,
  getClassComputedGradeLockStateForManager,
} from "@/services/classes/class-computed-grade-lock.service";

vi.mock("@/repositories/student-course-grade.repository");


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
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("assertClassStructureUnlockedForComputedGrades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows structure changes when no course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 0, error: null } as never);

    const result = await assertClassStructureUnlockedForComputedGrades(
      adminClient,
      classId
    );

    expect(result).toEqual({ ok: true });
  });

  it("blocks structure changes when any course grade exists", async () => {
    vi.mocked(
      studentCourseGradeRepository.countStudentCourseGradesByClassId
    ).mockResolvedValue({ count: 2, error: null } as never);

    const result = await assertClassStructureUnlockedForComputedGrades(
      adminClient,
      classId
    );

    expect(result).toEqual({
      ok: false,
      error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
    });
  });
});

describe("assertStudentGradeInputsUnlockedForComputedGrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows edits when the student has no course grade", async () => {
    vi.mocked(
      studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
    ).mockResolvedValue({ data: null, error: null } as never);

    const result = await assertStudentGradeInputsUnlockedForComputedGrade(
      adminClient,
      classId,
      userId
    );

    expect(result).toEqual({ ok: true });
  });

  it("blocks edits when the student has a course grade", async () => {
    vi.mocked(
      studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
    ).mockResolvedValue({
      data: { id: "grade-1", user_id: userId, class_id: classId },
      error: null,
    } as never);

    const result = await assertStudentGradeInputsUnlockedForComputedGrade(
      adminClient,
      classId,
      userId
    );

    expect(result).toEqual({
      ok: false,
      error: STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
    });
  });
});

describe("getClassComputedGradeLockStateForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns locked user ids for the class", async () => {
    vi.mocked(
      studentCourseGradeRepository.listStudentCourseGradeUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: userId }, { user_id: userId }],
      error: null,
    } as never);

    const result = await getClassComputedGradeLockStateForManager(
      adminClient,
      actorUserId,
      classId
    );

    expect(result).toEqual({
      hasComputedGrades: true,
      lockedUserIds: [userId],
    });
  });

  it("returns unlocked state when no course grades exist", async () => {
    vi.mocked(
      studentCourseGradeRepository.listStudentCourseGradeUserIdsByClassId
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await getClassComputedGradeLockStateForManager(
      adminClient,
      actorUserId,
      classId
    );

    expect(result).toEqual({
      hasComputedGrades: false,
      lockedUserIds: [],
    });
  });
});
