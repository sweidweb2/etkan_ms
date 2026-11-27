import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  listEmailingRecipientsForBulkForManager,
  listEmailingRecipientsPageForManager,
} from "@/services/communications/emailing-recipients.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
}));

const adminClient = {} as never;
const actorUserId = "11111111-1111-4111-8111-111111111111";

describe("listEmailingRecipientsPageForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is unauthorized", async () => {
    await expect(
      listEmailingRecipientsPageForManager(adminClient, null)
    ).rejects.toThrow("Unauthorized.");
  });

  it("pages all roles including students and hydrates emails for the page only", async () => {
    vi.mocked(profileRepository.listProfilesPage).mockResolvedValue({
      data: [
        {
          id: "student-1",
          full_name: "Student One",
          role: ROLES.STUDENT,
          is_instructor: false,
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "teacher-1",
          full_name: "Teacher One",
          role: ROLES.TEACHER,
          is_instructor: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: 2,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(profileRepository.countProfiles)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 2,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 1,
        status: 200,
        statusText: "OK",
      } as never);

    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([
        ["student-1", "student@school.com"],
        ["teacher-1", "teacher@school.com"],
      ]),
      error: null,
    });

    const result = await listEmailingRecipientsPageForManager(
      adminClient,
      actorUserId,
      { page: 1, pageSize: 10 }
    );

    expect(profileRepository.listProfilesPage).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        offset: 0,
        limit: 10,
        roles: undefined,
        search: "",
        ids: undefined,
      })
    );
    expect(authRepository.listAuthEmailsByIds).toHaveBeenCalledWith(
      adminClient,
      ["student-1", "teacher-1"]
    );
    expect(result).toEqual({
      users: [
        {
          id: "student-1",
          full_name: "Student One",
          role: ROLES.STUDENT,
          is_instructor: false,
          created_at: "2026-01-02T00:00:00.000Z",
          email: "student@school.com",
        },
        {
          id: "teacher-1",
          full_name: "Teacher One",
          role: ROLES.TEACHER,
          is_instructor: false,
          created_at: "2026-01-01T00:00:00.000Z",
          email: "teacher@school.com",
        },
      ],
      totalCount: 2,
      page: 1,
      pageSize: 10,
      stats: { total: 2, students: 1 },
    });
  });

  it("returns an empty page when userIds is an empty array", async () => {
    vi.mocked(profileRepository.countProfiles)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 5,
        status: 200,
        statusText: "OK",
      } as never)
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: 3,
        status: 200,
        statusText: "OK",
      } as never);

    const result = await listEmailingRecipientsPageForManager(
      adminClient,
      actorUserId,
      { userIds: [] }
    );

    expect(profileRepository.listProfilesPage).not.toHaveBeenCalled();
    expect(result.users).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.stats).toEqual({ total: 5, students: 3 });
  });
});

describe("listEmailingRecipientsForBulkForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("pages role-filtered profiles up to the bulk cap and hydrates emails", async () => {
    vi.mocked(profileRepository.listProfilesPage).mockResolvedValue({
      data: [
        {
          id: "student-1",
          full_name: "Student One",
          role: ROLES.STUDENT,
          is_instructor: false,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
      data: new Map([["student-1", "student@school.com"]]),
      error: null,
    });

    const result = await listEmailingRecipientsForBulkForManager(
      adminClient,
      actorUserId,
      [ROLES.STUDENT]
    );

    expect(profileRepository.listProfilesPage).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        offset: 0,
        limit: 100,
        roles: [ROLES.STUDENT],
      })
    );
    expect(profileRepository.listProfiles).not.toHaveBeenCalled();
    expect(result).toEqual({
      users: [
        {
          id: "student-1",
          full_name: "Student One",
          role: ROLES.STUDENT,
          is_instructor: false,
          created_at: "2026-01-02T00:00:00.000Z",
          email: "student@school.com",
        },
      ],
      truncated: false,
      limit: 500,
    });
  });
});
