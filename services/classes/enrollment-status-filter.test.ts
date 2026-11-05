import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { listAvailableStudentsForClass } from "@/services/classes/class.service";
import { computeAllStudentCourseGradesForManager } from "@/services/classes/student-course-grade.service";
import * as classService from "@/services/classes/class.service";
import * as studentService from "@/services/students/student.service";

vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-course-grade.repository");
vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/task.repository");
vi.mock("@/services/students/student.service", () => ({
  listStudentsForManager: vi.fn(),
}));
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/classes/class.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/classes/class.service")>();
  return {
    ...actual,
    assertClassGradesUnlockedForManager: vi
      .fn()
      .mockResolvedValue({ ok: true }),
    listClassStudentsForManager: vi.fn(),
    getClassFinalExamForManager: vi.fn(),
  };
});


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
const enrolledUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const pausedUserId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const outsideUserId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("listAvailableStudentsForClass enrollment membership", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("excludes any current class members from available list", async () => {
    vi.mocked(
      studentClassRepository.listStudentUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: enrolledUserId }, { user_id: pausedUserId }],
      error: null,
    } as never);
    vi.mocked(studentService.listStudentsForManager).mockResolvedValue([
      {
        id: "sp-1",
        user_id: enrolledUserId,
        full_name: "Enrolled",
        email: "e@example.com",
        phone: null,
      },
      {
        id: "sp-2",
        user_id: pausedUserId,
        full_name: "Also member",
        email: "p@example.com",
        phone: null,
      },
      {
        id: "sp-3",
        user_id: outsideUserId,
        full_name: "Outside",
        email: "o@example.com",
        phone: null,
      },
    ] as never);

    const result = await listAvailableStudentsForClass(
      adminClient,
      actor.userId,
      classId
    );

    expect(
      studentClassRepository.listStudentUserIdsByClassId
    ).toHaveBeenCalledWith(adminClient, classId);
    expect(
      studentClassRepository.listMemberUserIdsByClassId
    ).not.toHaveBeenCalled();
    expect(result.map((row) => row.user_id)).toEqual([outsideUserId]);
  });
});

describe("computeAllStudentCourseGradesForManager membership filter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(classService.assertClassGradesUnlockedForManager).mockResolvedValue(
      { ok: true } as never
    );
  });

  it("skips user ids that are not class members", async () => {
    vi.mocked(
      studentClassRepository.listStudentClassesByClassId
    ).mockResolvedValue({
      data: [
        {
          id: "enrollment-1",
          user_id: enrolledUserId,
          class_id: classId,
          joined_at: "2026-02-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const result = await computeAllStudentCourseGradesForManager(
      adminClient,
      actor.userId,
      actor,
      classId,
      [pausedUserId],
      undefined
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No students could be computed.");
    }
    expect(classService.listClassStudentsForManager).not.toHaveBeenCalled();
  });
});
