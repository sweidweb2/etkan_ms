import { describe, expect, it, vi, beforeEach } from "vitest";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  addStudentToSemesterForManager,
  listAvailableStudentsForSemester,
  listSemesterStudentsForManager,
} from "@/services/students/student-semester.service";
import * as studentService from "@/services/students/student.service";

vi.mock("@/repositories/student-semester.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/auth.repository");
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/students/student.service", () => ({
  listStudentsForManager: vi.fn(),
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
};
const semesterId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const studentProfileId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";

const studentRow = {
  user_id: "user-1",
  student_profile_id: studentProfileId,
  email: "student@example.com",
  full_name: "Student One",
  birth_date: null,
  phone: null,
  status: "active" as const,
  created_at: "2026-01-01T00:00:00.000Z",
};

const enrollmentRecord = {
  id: "enrollment-1",
  student_profile_id: studentProfileId,
  semester_id: semesterId,
  status: STUDENT_SEMESTER_STATUSES.PENDING,
  created_at: "2026-01-02T00:00:00.000Z",
};

describe("listSemesterStudentsForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listSemesterStudentsForManager(
        adminClient,
        null,
        semesterId,
        "Fall 2026"
      )
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns mapped enrollments", async () => {
    vi.mocked(studentSemesterRepository.listEnrollmentsBySemesterId).mockResolvedValue(
      {
        data: [enrollmentRecord],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      }
    );
    vi.mocked(studentProfileRepository.listStudentProfilesByIds).mockResolvedValue({
      data: [
        {
          id: studentProfileId,
          user_id: "user-1",
          full_name: "Student One",
          birth_date: null,
          phone: null,
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [
        {
          id: "user-1",
          full_name: "Student One",
          role: "student",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([["user-1", "student@example.com"]]),
      error: null,
    });

    const rows = await listSemesterStudentsForManager(
      adminClient,
      actor.userId,
      semesterId,
      "Fall 2026"
    );

    expect(rows).toEqual([
      {
        id: "enrollment-1",
        student_profile_id: studentProfileId,
        user_id: "user-1",
        full_name: "Student One",
        email: "student@example.com",
        phone: null,
        semester_id: semesterId,
        semester_name: "Fall 2026",
        status: STUDENT_SEMESTER_STATUSES.PENDING,
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ]);
  });
});

describe("listAvailableStudentsForSemester", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes already enrolled students", async () => {
    vi.mocked(
      studentSemesterRepository.listEnrolledStudentProfileIds
    ).mockResolvedValue({
      data: [{ student_profile_id: studentProfileId }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(studentService.listStudentsForManager).mockResolvedValue([
      studentRow,
      {
        ...studentRow,
        student_profile_id: "other-student",
        full_name: "Student Two",
        email: "two@example.com",
      },
    ]);

    const available = await listAvailableStudentsForSemester(
      adminClient,
      actor.userId,
      semesterId
    );

    expect(available).toHaveLength(1);
    expect(available[0]?.full_name).toBe("Student Two");
  });
});

describe("addStudentToSemesterForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized for non-manager", async () => {
    const result = await addStudentToSemesterForManager(
      adminClient,
      null,
      actor,
      {
        semester_id: semesterId,
        student_profile_id: studentProfileId,
        status: STUDENT_SEMESTER_STATUSES.PENDING,
      }
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("creates enrollment when valid", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        semester_code: "4821",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(
      studentSemesterRepository.findEnrollmentByStudentAndSemester
    ).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(studentSemesterRepository.createStudentSemesterEnrollment).mockResolvedValue(
      {
        data: enrollmentRecord,
        error: null,
        status: 201,
        statusText: "Created",
      }
    );
    vi.mocked(studentProfileRepository.findStudentProfileById).mockResolvedValue({
      data: {
        id: studentProfileId,
        user_id: "user-1",
        full_name: "Student One",
        birth_date: null,
        phone: null,
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [
        {
          id: "user-1",
          full_name: "Student One",
          role: "student",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([["user-1", "student@example.com"]]),
      error: null,
    });

    const result = await addStudentToSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      {
        semester_id: semesterId,
        student_profile_id: studentProfileId,
        status: STUDENT_SEMESTER_STATUSES.PENDING,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.enrollment.full_name).toBe("Student One");
      expect(result.message).toContain("Fall 2026");
    }
  });

  it("returns field error when already enrolled", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        semester_code: "4821",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    vi.mocked(
      studentSemesterRepository.findEnrollmentByStudentAndSemester
    ).mockResolvedValue({
      data: enrollmentRecord,
      error: null,
    });

    const result = await addStudentToSemesterForManager(
      adminClient,
      actor.userId,
      actor,
      {
        semester_id: semesterId,
        student_profile_id: studentProfileId,
        status: STUDENT_SEMESTER_STATUSES.PENDING,
      }
    );

    expect(result).toEqual({
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        student_profile_id: ["This student is already enrolled in this semester."],
      },
    });
  });
});
