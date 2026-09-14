import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { getAcademicAnalysisForManager } from "@/services/academic/academic-analysis.service";

vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/auth.repository");

vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
}));

const adminClient = {} as never;
const actorUserId = "11111111-1111-4111-8111-111111111111";
const classId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const studentUserId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";
const studentProfileId = "c3c4d5e6-f7a8-9012-cdef-123456789012";

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

describe("getAcademicAnalysisForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is unauthorized", async () => {
    await expect(
      getAcademicAnalysisForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("maps class session series and student status counts", async () => {
    vi.mocked(classRepository.listClassDetails).mockResolvedValue({
      data: [
        {
          id: classId,
          name: "Intro CS",
          subject_id: "subj-1",
          status: "in_progress",
          semester_id: null,
          created_at: "2026-01-01T00:00:00.000Z",
          subjects: { name: "CS101", nb_sessions: 12 },
          semesters: null,
        },
      ],
      ...okResult,
    });
    vi.mocked(sessionRepository.listSessionCountsByClassIds).mockResolvedValue({
      data: [{ class_id: classId }, { class_id: classId }, { class_id: classId }],
      ...okResult,
    });
    vi.mocked(studentProfileRepository.listStudentProfiles).mockResolvedValue({
      data: [
        {
          id: studentProfileId,
          user_id: studentUserId,
          full_name: "Ada Lovelace",
          birth_date: null,
          phone: null,
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "d4d5e6f7-a8b9-0123-def0-234567890123",
          user_id: "e5e6f7a8-b9c0-1234-ef01-345678901234",
          full_name: "Inactive Student",
          birth_date: null,
          phone: null,
          status: "inactive",
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [
        {
          id: studentUserId,
          username: "ada",
          role: "student",
          is_instructor: false,
          is_mentor: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "e5e6f7a8-b9c0-1234-ef01-345678901234",
          username: "inactive",
          role: "student",
          is_instructor: false,
          is_mentor: false,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      ...okResult,
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([
        [studentUserId, "ada@example.com"],
        ["e5e6f7a8-b9c0-1234-ef01-345678901234", "inactive@example.com"],
      ]),
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
    expect(result.students).toHaveLength(2);
    expect(result.students[0]?.full_name).toBe("Ada Lovelace");
  });
});
