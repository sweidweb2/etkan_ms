import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import { resolveActiveStudentDiff } from "@/services/classes/class-enrollment-diff.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/class.repository");
vi.mock("@/repositories/student-class.repository");
vi.mock("@/repositories/student-profile.repository");
vi.mock("@/repositories/student-semester.repository");

const adminClient = {} as never;
const targetClassId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sourceClassId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const semesterId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const userId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const profileId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

describe("resolveActiveStudentDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(classRepository.findClassById).mockImplementation(
      async (_client, id) =>
        ({
          data: {
            id,
            semester_id: semesterId,
            name: id === targetClassId ? "Target" : "Source",
          },
          error: null,
        }) as never
    );
    vi.mocked(
      studentClassRepository.listStudentUserIdsByClassId
    ).mockImplementation(async (_client, classId) => {
      if (classId === sourceClassId) {
        return { data: [{ user_id: userId }], error: null } as never;
      }
      return { data: [], error: null } as never;
    });
    vi.mocked(
      studentProfileRepository.listStudentProfileDetailsByUserIds
    ).mockResolvedValue({
      data: [
        {
          id: profileId,
          user_id: userId,
          full_name: "Dropped Student",
          birth_date: null,
          phone: null,
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    } as never);
    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([[userId, "d@example.com"]]),
      error: null,
    } as never);
  });

  it("annotates semester_dropped for withdrawn students", async () => {
    vi.mocked(
      studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester
    ).mockResolvedValue({
      data: [profileId],
      error: null,
    });

    const result = await resolveActiveStudentDiff(
      adminClient,
      targetClassId,
      sourceClassId
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.students).toHaveLength(1);
      expect(result.students[0]?.semester_dropped).toBe(true);
    }
    expect(
      studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester
    ).toHaveBeenCalledWith(adminClient, semesterId, [profileId]);
  });
});
