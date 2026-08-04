import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";

vi.mock("@/repositories/instructor-schedule-slot.repository");
vi.mock("@/repositories/instructor-subject-capability.repository");
vi.mock("@/repositories/workshop-instructor.repository");

const admin = {} as never;
const userId = "22222222-2222-4222-8222-222222222222";

const ok = {
  data: null,
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
} as const;

describe("clearInstructorWorkshopRelatedData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clears capabilities, workshop assignments, then schedule slots", async () => {
    vi.mocked(
      instructorSubjectCapabilityRepository.deleteCapabilitiesByUserId
    ).mockResolvedValue(ok as never);
    vi.mocked(
      workshopInstructorRepository.deleteWorkshopInstructorsByUserId
    ).mockResolvedValue(ok as never);
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord
    ).mockResolvedValue(ok as never);

    const result = await clearInstructorWorkshopRelatedData(admin, userId);

    expect(result).toEqual({ error: null });
    expect(
      instructorSubjectCapabilityRepository.deleteCapabilitiesByUserId
    ).toHaveBeenCalledWith(admin, userId);
    expect(
      workshopInstructorRepository.deleteWorkshopInstructorsByUserId
    ).toHaveBeenCalledWith(admin, userId);
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord
    ).toHaveBeenCalledWith(admin, "instructor", userId);
  });
});
