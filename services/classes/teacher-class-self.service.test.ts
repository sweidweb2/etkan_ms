import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import {
  assertPermission,
  assertTeacherSelfAccess,
} from "@/services/auth/authorization.service";
import {
  assertTeacherAssignedToClass,
  findTeacherClassAssignment,
  getMyClassDetailForTeacher,
  listMyClassSessionsForTeacher,
  listMyClassStudentsForTeacher,
  listMyClassesForTeacher,
  listMySubjectsForTeacher,
} from "@/services/classes/teacher-class-self.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/class-teacher.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/subject.repository");
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
  assertTeacherSelfAccess: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
    return userId;
  }),
}));

const adminClient = {} as never;
const teacherUserId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const otherClassId = "33333333-3333-4333-8333-333333333333";
const subjectId = "44444444-4444-4444-8444-444444444444";
const studentUserId = "55555555-5555-4555-8555-555555555555";

const classDetail = {
  id: classId,
  subject_id: subjectId,
  name: "Robotics A",
  status: "in_progress",
  semester_id: null,
  created_at: "2026-09-01T00:00:00.000Z",
  subjects: { name: "Robotics", nb_sessions: 12 },
  semesters: null,
};

describe("findTeacherClassAssignment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns true when assigned", async () => {
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: {
        id: "ct-1",
        teacher_id: teacherUserId,
        class_id: classId,
        assigned_by: null,
        assigned_at: null,
      },
      error: null,
    } as never);

    await expect(
      findTeacherClassAssignment(adminClient, teacherUserId, classId)
    ).resolves.toBe(true);
  });

  it("returns false when not assigned", async () => {
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(
      findTeacherClassAssignment(adminClient, teacherUserId, classId)
    ).resolves.toBe(false);
  });
});

describe("assertTeacherAssignedToClass", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertTeacherSelfAccess).mockImplementation(async (_c, userId) => {
      if (!userId) throw new Error("Unauthorized.");
      return userId;
    });
  });

  it("returns teacher id when assigned", async () => {
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: {
        id: "ct-1",
        teacher_id: teacherUserId,
        class_id: classId,
        assigned_by: null,
        assigned_at: null,
      },
      error: null,
    } as never);

    await expect(
      assertTeacherAssignedToClass(adminClient, teacherUserId, classId)
    ).resolves.toBe(teacherUserId);
  });

  it("throws when not assigned", async () => {
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(
      assertTeacherAssignedToClass(adminClient, teacherUserId, classId)
    ).rejects.toThrow("Unauthorized.");
  });

  it("throws when class id is not a uuid", async () => {
    await expect(
      assertTeacherAssignedToClass(adminClient, teacherUserId, "not-a-uuid")
    ).rejects.toThrow("Unauthorized.");
  });
});

describe("listMyClassesForTeacher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(assertTeacherSelfAccess).mockResolvedValue(teacherUserId);
  });

  it("returns mapped classes for assignments", async () => {
    vi.mocked(
      classTeacherRepository.listClassTeachersByTeacherId
    ).mockResolvedValue({
      data: [
        {
          id: "ct-1",
          teacher_id: teacherUserId,
          class_id: classId,
          assigned_by: null,
          assigned_at: null,
        },
      ],
      error: null,
    } as never);
    vi.mocked(classRepository.listClassDetailsByIds).mockResolvedValue({
      data: [classDetail],
      error: null,
    } as never);
    vi.mocked(
      studentClassRepository.listStudentClassCountsByClassIds
    ).mockResolvedValue({
      data: [{ class_id: classId }],
      error: null,
    } as never);
    vi.mocked(
      classTeacherRepository.listClassTeacherCountsByClassIds
    ).mockResolvedValue({
      data: [{ class_id: classId }],
      error: null,
    } as never);
    vi.mocked(sessionRepository.listSessionCountsByClassIds).mockResolvedValue({
      data: [{ class_id: classId }, { class_id: classId }],
      error: null,
    } as never);

    const rows = await listMyClassesForTeacher(adminClient, teacherUserId);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: classId,
      name: "Robotics A",
      subject_name: "Robotics",
      enrollment_count: 1,
      teacher_count: 1,
      completed_sessions: 2,
    });
  });

  it("returns empty when teacher has no assignments", async () => {
    vi.mocked(
      classTeacherRepository.listClassTeachersByTeacherId
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    await expect(
      listMyClassesForTeacher(adminClient, teacherUserId)
    ).resolves.toEqual([]);
  });
});

describe("listMyClassStudentsForTeacher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(assertTeacherSelfAccess).mockResolvedValue(teacherUserId);
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: {
        id: "ct-1",
        teacher_id: teacherUserId,
        class_id: classId,
        assigned_by: null,
        assigned_at: null,
      },
      error: null,
    } as never);
  });

  it("returns roster when assigned", async () => {
    vi.mocked(
      studentClassRepository.listStudentClassesByClassId
    ).mockResolvedValue({
      data: [
        {
          id: "sc-1",
          user_id: studentUserId,
          class_id: classId,
          joined_at: "2026-09-02T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [{ id: studentUserId, username: "ada" }],
      error: null,
    } as never);
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: "sp-1",
          user_id: studentUserId,
          full_name: "Ada Lovelace",
          phone: null,
        },
      ],
      error: null,
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([[studentUserId, "ada@example.com"]]),
      error: null,
    } as never);

    const rows = await listMyClassStudentsForTeacher(
      adminClient,
      teacherUserId,
      classId
    );

    expect(rows).toEqual([
      {
        id: "sc-1",
        student_profile_id: "sp-1",
        user_id: studentUserId,
        full_name: "Ada Lovelace",
        username: "ada",
        email: "ada@example.com",
        phone: null,
        joined_at: "2026-09-02T00:00:00.000Z",
      },
    ]);
  });

  it("throws when not assigned", async () => {
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(
      listMyClassStudentsForTeacher(adminClient, teacherUserId, classId)
    ).rejects.toThrow("Unauthorized.");
  });
});

describe("listMyClassSessionsForTeacher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(assertTeacherSelfAccess).mockResolvedValue(teacherUserId);
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: {
        id: "ct-1",
        teacher_id: teacherUserId,
        class_id: classId,
        assigned_by: null,
        assigned_at: null,
      },
      error: null,
    } as never);
  });

  it("returns sessions ordered by nb_order", async () => {
    vi.mocked(sessionRepository.listSessionsByClassId).mockResolvedValue({
      data: [
        {
          id: "s-2",
          class_id: classId,
          nb_order: 2,
          topic: "Sensors",
          session_report: null,
          starts_at: "2026-09-10T10:00:00.000Z",
          ends_at: "2026-09-10T11:00:00.000Z",
          semester_id: null,
          group_grade_level: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: "s-1",
          class_id: classId,
          nb_order: 1,
          topic: "Intro",
          session_report: null,
          starts_at: "2026-09-03T10:00:00.000Z",
          ends_at: "2026-09-03T11:00:00.000Z",
          semester_id: null,
          group_grade_level: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const rows = await listMyClassSessionsForTeacher(
      adminClient,
      teacherUserId,
      classId
    );

    expect(rows.map((row) => row.nb_order)).toEqual([1, 2]);
  });
});

describe("getMyClassDetailForTeacher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(assertTeacherSelfAccess).mockResolvedValue(teacherUserId);
    vi.mocked(
      classTeacherRepository.findClassTeacherByTeacherAndClass
    ).mockResolvedValue({
      data: {
        id: "ct-1",
        teacher_id: teacherUserId,
        class_id: classId,
        assigned_by: null,
        assigned_at: null,
      },
      error: null,
    } as never);
  });

  it("returns null when class row is missing", async () => {
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(
      getMyClassDetailForTeacher(adminClient, teacherUserId, classId)
    ).resolves.toBeNull();
  });

  it("returns detail with sessions and students", async () => {
    vi.mocked(classRepository.findClassDetailById).mockResolvedValue({
      data: classDetail,
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
      count: 1,
      error: null,
    } as never);
    vi.mocked(sessionRepository.listSessionCountsByClassIds).mockResolvedValue({
      data: [{ class_id: classId }],
      error: null,
    } as never);
    vi.mocked(sessionRepository.listSessionsByClassId).mockResolvedValue({
      data: [
        {
          id: "s-1",
          class_id: classId,
          nb_order: 1,
          topic: "Intro",
          session_report: null,
          starts_at: "2026-09-03T10:00:00.000Z",
          ends_at: "2026-09-03T11:00:00.000Z",
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
      data: [],
      error: null,
    } as never);

    const detail = await getMyClassDetailForTeacher(
      adminClient,
      teacherUserId,
      classId
    );

    expect(detail?.classRow.name).toBe("Robotics A");
    expect(detail?.sessions).toHaveLength(1);
    expect(detail?.students).toEqual([]);
  });
});

describe("listMySubjectsForTeacher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(assertTeacherSelfAccess).mockResolvedValue(teacherUserId);
  });

  it("returns distinct subjects with taught class ids", async () => {
    vi.mocked(
      classTeacherRepository.listClassTeachersByTeacherId
    ).mockResolvedValue({
      data: [
        {
          id: "ct-1",
          teacher_id: teacherUserId,
          class_id: classId,
          assigned_by: null,
          assigned_at: null,
        },
        {
          id: "ct-2",
          teacher_id: teacherUserId,
          class_id: otherClassId,
          assigned_by: null,
          assigned_at: null,
        },
      ],
      error: null,
    } as never);
    vi.mocked(classRepository.listClassDetailsByIds).mockResolvedValue({
      data: [
        classDetail,
        {
          ...classDetail,
          id: otherClassId,
          name: "Robotics B",
        },
      ],
      error: null,
    } as never);
    vi.mocked(subjectRepository.listSubjectsByIds).mockResolvedValue({
      data: [
        {
          id: subjectId,
          name: "Robotics",
          syllabus_link: "https://example.com/syllabus",
          reference_link: null,
          handout_link: null,
          nb_sessions: 12,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);

    const rows = await listMySubjectsForTeacher(adminClient, teacherUserId);

    expect(rows).toEqual([
      {
        id: subjectId,
        name: "Robotics",
        syllabus_link: "https://example.com/syllabus",
        reference_link: null,
        handout_link: null,
        nb_sessions: 12,
        taught_class_ids: [classId, otherClassId],
        taught_class_count: 2,
      },
    ]);
  });
});
