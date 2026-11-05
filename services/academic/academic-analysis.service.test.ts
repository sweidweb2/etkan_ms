import { beforeEach, describe, expect, it, vi } from "vitest";
import * as academicAnalysisRepository from "@/repositories/academic-analysis.repository";
import { getAcademicAnalysisForManager } from "@/services/academic/academic-analysis.service";

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
      academicAnalysisRepository.listClassSessionProgress
    ).not.toHaveBeenCalled();
  });

  it("maps status counts and session series", async () => {
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

    const result = await getAcademicAnalysisForManager(
      adminClient,
      actorUserId
    );

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
  });
});
