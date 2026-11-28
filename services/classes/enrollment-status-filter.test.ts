import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as classRepository from "@/repositories/class.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { listAvailableStudentsForClass } from "@/services/classes/class.service";
import { computeAllStudentCourseGradesForManager } from "@/services/classes/student-course-grade.service";
import * as classService from "@/services/classes/class.service";
import * as studentService from "@/services/students/student.service";

vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-semester.repository");
vi.mock("@/repositories/student-course-grade.repository");
vi.mock("@/repositories/attendee.repository");
vi.mock("@/repositories/final-exam.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/services/students/student.service", () => ({
  hydrateStudentRows: vi.fn(),
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
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: {
        id: classId,
        semester_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      },
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.listStudentUserIdsByClassId
    ).mockResolvedValue({
      data: [{ user_id: enrolledUserId }, { user_id: pausedUserId }],
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesPage
    ).mockResolvedValue({
      data: [
        {
          id: "sp-3",
          user_id: outsideUserId,
          full_name: "Outside",
          birth_date: null,
          phone: null,
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      count: 1,
      error: null,
    } as never);
    vi.mocked(studentService.hydrateStudentRows).mockResolvedValue([
      {
        student_profile_id: "sp-3",
        user_id: outsideUserId,
        full_name: "Outside",
        email: "o@example.com",
        phone: null,
        birth_date: null,
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ] as never);
    vi.mocked(
      studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester
    ).mockResolvedValue({
      data: [],
      error: null,
    });

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
    expect(studentProfileRepository.listStudentProfilesPage).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        excludeUserIds: [enrolledUserId, pausedUserId],
        status: "active",
      })
    );
    expect(result.students.map((row) => row.user_id)).toEqual([outsideUserId]);
    expect(result.totalCount).toBe(1);
    expect(result.students[0]?.semester_dropped).toBeUndefined();
  });

  it("annotates semester_dropped for withdrawn semester students", async () => {
    const semesterId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    vi.mocked(classRepository.findClassById).mockResolvedValue({
      data: { id: classId, semester_id: semesterId },
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.listStudentUserIdsByClassId
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfilesPage
    ).mockResolvedValue({
      data: [
        {
          id: "sp-dropped",
          user_id: outsideUserId,
          full_name: "Dropped",
          birth_date: null,
          phone: null,
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      count: 1,
      error: null,
    } as never);
    vi.mocked(studentService.hydrateStudentRows).mockResolvedValue([
      {
        student_profile_id: "sp-dropped",
        user_id: outsideUserId,
        full_name: "Dropped",
        email: "d@example.com",
        phone: null,
        birth_date: null,
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ] as never);
    vi.mocked(
      studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester
    ).mockResolvedValue({
      data: ["sp-dropped"],
      error: null,
    });

    const result = await listAvailableStudentsForClass(
      adminClient,
      actor.userId,
      classId
    );

    expect(result.students).toHaveLength(1);
    expect(result.students[0]?.semester_dropped).toBe(true);
    expect(
      studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester
    ).toHaveBeenCalledWith(adminClient, semesterId, ["sp-dropped"]);
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
