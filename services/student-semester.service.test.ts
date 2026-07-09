import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import {
  addStudentToSemesterForManager,
  listAvailableStudentsForSemester,
  listSemesterStudentsForManager,
} from "@/services/student-semester.service";
import * as studentService from "@/services/student.service";

vi.mock("@/repositories/student-semester.repository");
vi.mock("@/repositories/semester.repository");
vi.mock("@/services/student.service");

const adminClient = {} as never;
const semesterId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const studentProfileId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";

const studentRow = {
  user_id: "user-1",
  student_profile_id: studentProfileId,
  username: "student1",
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
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listSemesterStudentsForManager(
        adminClient,
        ROLES.TEACHER,
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
    vi.mocked(studentService.listStudentsForManager).mockResolvedValue([studentRow]);

    const rows = await listSemesterStudentsForManager(
      adminClient,
      ROLES.MANAGER,
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
    vi.resetAllMocks();
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
      ROLES.MANAGER,
      semesterId
    );

    expect(available).toHaveLength(1);
    expect(available[0]?.full_name).toBe("Student Two");
  });
});

describe("addStudentToSemesterForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns unauthorized for non-manager", async () => {
    const result = await addStudentToSemesterForManager(adminClient, ROLES.TEACHER, {
      semester_id: semesterId,
      student_profile_id: studentProfileId,
      status: STUDENT_SEMESTER_STATUSES.PENDING,
    });

    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("creates enrollment when valid", async () => {
    vi.mocked(semesterRepository.findSemesterById).mockResolvedValue({
      data: {
        id: semesterId,
        name: "Fall 2026",
        nb_courses: 0,
        amount: 100,
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
    vi.mocked(studentService.listStudentsForManager).mockResolvedValue([studentRow]);

    const result = await addStudentToSemesterForManager(
      adminClient,
      ROLES.MANAGER,
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
        nb_courses: 0,
        amount: 100,
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
      ROLES.MANAGER,
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
