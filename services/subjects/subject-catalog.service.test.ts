import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { SUBJECT_SCOPES } from "@/lib/constants/subject-scope";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as instructorSubjectRepository from "@/repositories/instructor-subject.repository";
import * as mentorSubjectCapabilityRepository from "@/repositories/mentor-subject-capability.repository";
import * as mentorSubjectRepository from "@/repositories/mentor-subject.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { setSubjectCapabilityForManager } from "@/services/subjects/subject-catalog.service";

vi.mock("@/repositories/instructor-subject-capability.repository");
vi.mock("@/repositories/instructor-subject.repository");
vi.mock("@/repositories/mentor-subject-capability.repository");
vi.mock("@/repositories/mentor-subject.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn().mockResolvedValue(undefined),
  getUnauthorizedError: vi.fn().mockResolvedValue(null),
}));

const adminClient = {} as never;
const actorUserId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const subjectId = "33333333-3333-4333-8333-333333333333";

const okResult = { error: null, count: null, status: 200, statusText: "OK" };

const subjectRow = {
  id: subjectId,
  name: "Arduino",
  sort_order: 0,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("setSubjectCapabilityForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("writes to the instructor tables for the instructor scope", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: userId,
        username: "alice",
        role: ROLES.TEACHER,
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      ...okResult,
    });
    vi.mocked(
      instructorSubjectRepository.findInstructorSubjectById
    ).mockResolvedValue({ data: subjectRow, ...okResult });
    vi.mocked(
      instructorSubjectCapabilityRepository.listCapabilitiesByUserIds
    ).mockResolvedValue({ data: [], error: null });
    vi.mocked(
      instructorSubjectCapabilityRepository.insertCapabilities
    ).mockResolvedValue({ error: null });

    const result = await setSubjectCapabilityForManager(
      adminClient,
      actorUserId,
      SUBJECT_SCOPES.INSTRUCTOR,
      { user_id: userId, subject_id: subjectId, enabled: true }
    );

    expect(result).toEqual({
      success: true,
      message: "Capability updated.",
      user_id: userId,
      subject_id: subjectId,
      enabled: true,
    });
    expect(
      instructorSubjectCapabilityRepository.insertCapabilities
    ).toHaveBeenCalledWith(adminClient, [
      { user_id: userId, subject_id: subjectId },
    ]);
    expect(
      mentorSubjectCapabilityRepository.insertCapabilities
    ).not.toHaveBeenCalled();
  });

  it("rejects a non-mentor row on the mentor scope", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: userId,
        username: "alice",
        role: ROLES.TEACHER,
        is_mentor: false,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      ...okResult,
    });
    vi.mocked(mentorSubjectRepository.findMentorSubjectById).mockResolvedValue({
      data: subjectRow,
      ...okResult,
    });
    vi.mocked(
      mentorSubjectCapabilityRepository.listCapabilitiesByUserIds
    ).mockResolvedValue({ data: [], error: null });

    const result = await setSubjectCapabilityForManager(
      adminClient,
      actorUserId,
      SUBJECT_SCOPES.MENTOR,
      { user_id: userId, subject_id: subjectId, enabled: true }
    );

    expect(result).toEqual({ success: false, error: "Mentor not found." });
    expect(
      mentorSubjectCapabilityRepository.insertCapabilities
    ).not.toHaveBeenCalled();
  });
});
