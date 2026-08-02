import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import { removeInstructorForManager } from "@/services/instructor.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/subject.repository");
vi.mock("@/repositories/instructor-subject-capability.repository");
vi.mock("@/repositories/workshop-instructor.repository");

vi.mock("@/services/authorization.service", () => ({
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

describe("removeInstructorForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("deletes workshop instructor rows when removing instructor flag", async () => {
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
    vi.mocked(
      instructorSubjectCapabilityRepository.deleteCapabilitiesByUserId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.deleteWorkshopInstructorsByUserId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
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
    expect(
      workshopInstructorRepository.deleteWorkshopInstructorsByUserId
    ).toHaveBeenCalledWith(adminClient, instructorId);
  });
});
