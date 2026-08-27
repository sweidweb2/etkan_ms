import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearInstructorWorkshopRelatedData } from "@/lib/manager/instructors/clear-instructor-related";
import * as clearInstructorRelatedRepository from "@/repositories/clear-instructor-related.repository";

vi.mock("@/repositories/clear-instructor-related.repository");

const admin = {} as never;
const userId = "22222222-2222-4222-8222-222222222222";

describe("clearInstructorWorkshopRelatedData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clears related data through one RPC", async () => {
    vi.mocked(
      clearInstructorRelatedRepository.clearInstructorRelatedData
    ).mockResolvedValue({
      data: {
        capabilities: 2,
        workshop_instructors: 1,
        schedule_slots: 3,
      },
      error: null,
    });

    const result = await clearInstructorWorkshopRelatedData(admin, userId);

    expect(result).toEqual({ error: null });
    expect(
      clearInstructorRelatedRepository.clearInstructorRelatedData
    ).toHaveBeenCalledWith(admin, userId);
  });

  it("returns the RPC error message", async () => {
    vi.mocked(
      clearInstructorRelatedRepository.clearInstructorRelatedData
    ).mockResolvedValue({
      data: null,
      error: { message: "clear failed" } as never,
    });

    const result = await clearInstructorWorkshopRelatedData(admin, userId);

    expect(result).toEqual({
      error: "clear failed",
    });
  });
});
