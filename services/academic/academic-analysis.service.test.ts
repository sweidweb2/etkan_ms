import { beforeEach, describe, expect, it, vi } from "vitest";
import * as academicAnalysisRepository from "@/repositories/academic-analysis.repository";
import {
  getAcademicAnalysisForManager,
  listAcademicAnalysisStudentsPageForManager,
} from "@/services/academic/academic-analysis.service";

vi.mock("@/repositories/academic-analysis.repository");

vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
}));

const adminClient = {} as never;
const actorUserId = "11111111-1111-4111-8111-111111111111";
const classId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const studentProfileId = "c3c4d5e6-f7a8-9012-cdef-123456789012";

describe("getAcademicAnalysisForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is unauthorized", async () => {
    await expect(
      getAcademicAnalysisForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
    expect(
      academicAnalysisRepository.academicAnalysisStudentCounts
    ).not.toHaveBeenCalled();
    expect(
      academicAnalysisRepository.listAcademicAnalysisStudents
    ).not.toHaveBeenCalled();
  });

  it("maps status counts, session series, and the first student page", async () => {
    vi.mocked(
      academicAnalysisRepository.academicAnalysisStudentCounts
    ).mockResolvedValue({
      data: { active_count: 1, inactive_count: 1, total_count: 2 },
      error: null,
    });
    vi.mocked(
      academicAnalysisRepository.listClassSessionProgress
    ).mockResolvedValue({
      data: [
        {
          class_id: classId,
          class_name: "Intro CS",
          status: "in_progress",
          actual_sessions: 3,
          planned_sessions: 12,
        },
      ],
      error: null,
    });
    vi.mocked(
      academicAnalysisRepository.listAcademicAnalysisStudents
    ).mockResolvedValue({
      data: {
        total: 2,
        page: 1,
        page_size: 10,
        students: [
          {
            id: studentProfileId,
            full_name: "Ada Lovelace",
            username: "ada",
            status: "active",
          },
          {
            id: "d4d5e6f7-a8b9-0123-def0-234567890123",
            full_name: "Inactive Student",
            username: "inactive",
            status: "inactive",
          },
        ],
      },
      error: null,
    });

    const result = await getAcademicAnalysisForManager(
      adminClient,
      actorUserId
    );

    expect(
      academicAnalysisRepository.listAcademicAnalysisStudents
    ).toHaveBeenCalledWith(adminClient, {
      status: null,
      search: null,
      limit: 10,
      offset: 0,
    });
    expect(result.classCount).toBe(1);
    expect(result.studentCounts).toEqual({
      active: 1,
      inactive: 1,
      total: 2,
    });
    expect(result.classSessionSeries).toEqual([
      {
        classId,
        className: "Intro CS",
        status: "in_progress",
        actualSessions: 3,
        plannedSessions: 12,
      },
    ]);
    expect(result.studentsPage.total).toBe(2);
    expect(result.studentsPage.students[0]?.full_name).toBe("Ada Lovelace");
    expect(result.studentsPage.students[0]).not.toHaveProperty("email");
  });
});

describe("listAcademicAnalysisStudentsPageForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clamps page size and forwards status and search", async () => {
    vi.mocked(
      academicAnalysisRepository.listAcademicAnalysisStudents
    ).mockResolvedValue({
      data: {
        total: 1,
        page: 2,
        page_size: 25,
        students: [
          {
            id: studentProfileId,
            full_name: "Ada Lovelace",
            username: "ada",
            status: "graduated",
          },
        ],
      },
      error: null,
    });

    const page = await listAcademicAnalysisStudentsPageForManager(
      adminClient,
      actorUserId,
      {
        page: 2,
        pageSize: 500,
        status: "graduated",
        search: " ada% ",
      }
    );

    expect(
      academicAnalysisRepository.listAcademicAnalysisStudents
    ).toHaveBeenCalledWith(adminClient, {
      status: "graduated",
      search: "ada",
      limit: 25,
      offset: 25,
    });
    expect(page.students[0]?.status).toBe("graduated");
    expect(page.page).toBe(2);
  });
});
