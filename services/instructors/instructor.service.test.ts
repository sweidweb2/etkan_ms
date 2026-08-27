import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as mentorSubjectCapabilityRepository from "@/repositories/mentor-subject-capability.repository";
import * as mentorSubjectRepository from "@/repositories/mentor-subject.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  addInstructorsForManager,
  removeInstructorForManager,
  saveInstructorSubjectCapabilities,
  saveMentorSubjectOrderForManager,
  setInstructorCapabilityForManager,
} from "@/services/instructors/instructor.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/mentor-subject.repository");
vi.mock("@/repositories/mentor-subject-capability.repository");
vi.mock("@/lib/manager/instructors/clear-instructor-related", () => ({
  clearInstructorWorkshopRelatedData: vi.fn(),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
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
const actorUserId = "11111111-1111-4111-8111-111111111111";
const instructorId = "22222222-2222-4222-8222-222222222222";

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

describe("addInstructorsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("promotes selected users in one batch update", async () => {
    const secondId = "33333333-3333-4333-8333-333333333333";
    vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
      data: [
        {
          id: instructorId,
          username: "teacher_one",
          role: ROLES.TEACHER,
          is_instructor: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: secondId,
          username: "teacher_two",
          role: ROLES.TEACHER,
          is_instructor: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(profileRepository.setProfilesInstructorFlag).mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await addInstructorsForManager(adminClient, actorUserId, {
      userIds: [instructorId, secondId],
    });

    expect(result).toEqual({
      success: true,
      message: "2 instructors added.",
      addedCount: 2,
    });
    expect(profileRepository.setProfilesInstructorFlag).toHaveBeenCalledTimes(1);
    expect(profileRepository.setProfilesInstructorFlag).toHaveBeenCalledWith(
      adminClient,
      [instructorId, secondId],
      true
    );
    expect(profileRepository.updateProfileInstructorFlag).not.toHaveBeenCalled();
  });
});

describe("saveInstructorSubjectCapabilities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads id lists and applies batch insert/delete", async () => {
    const mentorSubjectId = "44444444-4444-4444-8444-444444444444";
    vi.mocked(profileRepository.listInstructorProfileIds).mockResolvedValue({
      data: [{ id: instructorId }],
      ...okResult,
    });
    vi.mocked(mentorSubjectRepository.listMentorSubjectIds).mockResolvedValue({
      data: [{ id: mentorSubjectId }],
      ...okResult,
    });
    vi.mocked(
      mentorSubjectCapabilityRepository.listMentorSubjectCapabilitiesByUserIds
    ).mockResolvedValue({
      data: [],
      ...okResult,
    });
    vi.mocked(
      mentorSubjectCapabilityRepository.deleteCapabilitiesByPairs
    ).mockResolvedValue({ data: 0, error: null });
    vi.mocked(
      mentorSubjectCapabilityRepository.insertCapabilities
    ).mockResolvedValue({ error: null });

    const result = await saveInstructorSubjectCapabilities(
      adminClient,
      actorUserId,
      {
        capabilities: [
          { user_id: instructorId, mentor_subject_id: mentorSubjectId },
        ],
      }
    );

    expect(result.success).toBe(true);
    expect(profileRepository.listInstructorProfiles).not.toHaveBeenCalled();
    expect(mentorSubjectRepository.listMentorSubjects).not.toHaveBeenCalled();
    expect(
      mentorSubjectCapabilityRepository.insertCapabilities
    ).toHaveBeenCalledWith(adminClient, [
      { user_id: instructorId, mentor_subject_id: mentorSubjectId },
    ]);
  });
});

describe("saveMentorSubjectOrderForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reorders through one RPC and returns ordered rows", async () => {
    const firstId = "44444444-4444-4444-8444-444444444444";
    const secondId = "55555555-5555-4555-8555-555555555555";
    vi.mocked(mentorSubjectRepository.reorderMentorSubjects).mockResolvedValue({
      data: [
        {
          id: secondId,
          name: "B",
          sort_order: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: firstId,
          name: "A",
          sort_order: 1,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      ...okResult,
    });

    const result = await saveMentorSubjectOrderForManager(
      adminClient,
      actorUserId,
      { orderedIds: [secondId, firstId] }
    );

    expect(result).toEqual({
      success: true,
      message: "Mentor subject order saved.",
      mentorSubjects: [
        { id: secondId, name: "B", sort_order: 0 },
        { id: firstId, name: "A", sort_order: 1 },
      ],
    });
    expect(mentorSubjectRepository.reorderMentorSubjects).toHaveBeenCalledWith(
      adminClient,
      [secondId, firstId]
    );
    expect(mentorSubjectRepository.updateMentorSubjectSortOrder).not.toHaveBeenCalled();
  });
});
describe("removeInstructorForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clears instructor-related data then removes instructor flag", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: instructorId,
        username: "lead_teacher",
        role: ROLES.TEACHER,
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(clearInstructorWorkshopRelatedData).mockResolvedValue({
      error: null,
    });
    vi.mocked(
      profileRepository.updateProfileInstructorFlag
    ).mockResolvedValue({
      data: {
        id: instructorId,
        is_instructor: false,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await removeInstructorForManager(
      adminClient,
      actorUserId,
      instructorId
    );

    expect(result).toEqual({
      success: true,
      message: "Instructor removed.",
      userId: instructorId,
    });
    expect(clearInstructorWorkshopRelatedData).toHaveBeenCalledWith(
      adminClient,
      instructorId
    );
    expect(profileRepository.updateProfileInstructorFlag).toHaveBeenCalledWith(
      adminClient,
      instructorId,
      false
    );
  });
});

describe("setInstructorCapabilityForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("inserts a capability when enabling", async () => {
    const mentorSubjectId = "44444444-4444-4444-8444-444444444444";
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: instructorId,
        username: "lead_teacher",
        role: ROLES.TEACHER,
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      ...okResult,
    });
    vi.mocked(mentorSubjectRepository.findMentorSubjectById).mockResolvedValue({
      data: {
        id: mentorSubjectId,
        name: "Arduino",
        sort_order: 0,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      ...okResult,
    });
    vi.mocked(
      mentorSubjectCapabilityRepository.listMentorSubjectCapabilitiesByUserIds
    ).mockResolvedValue({
      data: [],
      ...okResult,
    });
    vi.mocked(
      mentorSubjectCapabilityRepository.insertCapabilities
    ).mockResolvedValue({ error: null });

    const result = await setInstructorCapabilityForManager(
      adminClient,
      actorUserId,
      {
        user_id: instructorId,
        mentor_subject_id: mentorSubjectId,
        enabled: true,
      }
    );

    expect(result).toEqual({
      success: true,
      message: "Capability updated.",
      user_id: instructorId,
      mentor_subject_id: mentorSubjectId,
      enabled: true,
    });
    expect(
      mentorSubjectCapabilityRepository.insertCapabilities
    ).toHaveBeenCalledWith(adminClient, [
      { user_id: instructorId, mentor_subject_id: mentorSubjectId },
    ]);
  });
});
