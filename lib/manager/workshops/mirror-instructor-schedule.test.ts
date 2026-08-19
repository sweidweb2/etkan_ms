import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  deleteAllMirrorsForWorkshop,
  deleteAllWorkshopEntitySlots,
  deleteMirrorsForWorkshopInstructor,
  deleteMirrorsForWorkshopSlot,
  mirrorWorkshopSlotToAllInstructors,
  mirrorWorkshopSlotsToInstructor,
  recopyAllMirrorsForWorkshop,
  updateMirrorsForWorkshopSlot,
} from "@/lib/manager/workshops/mirror-instructor-schedule";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";

vi.mock("@/repositories/instructor-schedule-slot.repository");
vi.mock("@/repositories/workshop-instructor.repository");

const admin = {} as never;
const workshopId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const instructorUserId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";
const slotId = "66666666-6666-4666-8666-666666666666";

const workshopSlot = {
  id: slotId,
  entity_type: "workshop",
  record_id: workshopId,
  name: "Session block",
  type: "busy",
  slot_date: "2026-09-01",
  day_of_week: 1,
  start_time: "09:00:00",
  end_time: "11:00:00",
  source_workshop_id: null,
  source_slot_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const ok = {
  data: null,
  error: null,
  count: 0,
  status: 200,
  statusText: "OK",
} as const;

const emptyList = {
  data: [],
  error: null,
  count: 0,
  status: 200,
  statusText: "OK",
} as const;

function mockBatchInstructorSlots(slots: Record<string, unknown>[] = []) {
  vi.mocked(
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByInstructorUserIds
  ).mockResolvedValue({
    data: slots,
    error: null,
    count: slots.length,
    status: 200,
    statusText: "OK",
  } as never);
}

function mockListByRecord(workshopSlots = [workshopSlot]) {
  vi.mocked(
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
  ).mockImplementation(async (_c, entityType) => {
    if (entityType === "workshop") {
      return {
        data: workshopSlots,
        error: null,
        count: workshopSlots.length,
        status: 200,
        statusText: "OK",
      } as never;
    }
    return emptyList as never;
  });
}

describe("mirror-instructor-schedule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("mirrorWorkshopSlotsToInstructor inserts busy mirrors with source columns", async () => {
    mockListByRecord();
    mockBatchInstructorSlots();
    vi.mocked(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await mirrorWorkshopSlotsToInstructor(
      admin,
      workshopId,
      instructorUserId
    );

    expect(result).toEqual({ error: null, count: 1 });
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).toHaveBeenCalledWith(admin, [
      {
        entity_type: "instructor",
        record_id: instructorUserId,
        name: "Session block",
        type: "busy",
        slot_date: "2026-09-01",
        day_of_week: 1,
        start_time: "09:00:00",
        end_time: "11:00:00",
        source_workshop_id: workshopId,
        source_slot_id: slotId,
      },
    ]);
  });

  it("mirrorWorkshopSlotToAllInstructors fans out to each instructor", async () => {
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [
        { user_id: instructorUserId },
        { user_id: "c3c4d5e6-f7a8-9012-cdef-123456789012" },
      ],
      error: null,
      count: 2,
      status: 200,
      statusText: "OK",
    } as never);
    mockListByRecord();
    mockBatchInstructorSlots();
    vi.mocked(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 2,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await mirrorWorkshopSlotToAllInstructors(admin, workshopSlot);

    expect(result).toEqual({ error: null, count: 2 });
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).toHaveBeenCalledWith(
      admin,
      expect.arrayContaining([
        expect.objectContaining({
          record_id: instructorUserId,
          source_slot_id: slotId,
          type: "busy",
        }),
        expect.objectContaining({
          record_id: "c3c4d5e6-f7a8-9012-cdef-123456789012",
          source_slot_id: slotId,
        }),
      ])
    );
  });

  it("updateMirrorsForWorkshopSlot patches by source_slot_id", async () => {
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [{ user_id: instructorUserId }],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);
    mockListByRecord();
    mockBatchInstructorSlots();
    vi.mocked(
      instructorScheduleSlotRepository.updateInstructorScheduleSlotsBySourceSlotId
    ).mockResolvedValue({
      data: [{ id: "mirror-1" }],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateMirrorsForWorkshopSlot(admin, workshopSlot);

    expect(result).toEqual({ error: null, count: 1 });
    expect(
      instructorScheduleSlotRepository.updateInstructorScheduleSlotsBySourceSlotId
    ).toHaveBeenCalledWith(admin, slotId, {
      name: "Session block",
      type: "busy",
      slot_date: "2026-09-01",
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "11:00:00",
    });
  });

  it("deleteMirrorsForWorkshopSlot deletes by source_slot_id", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceSlotId
    ).mockResolvedValue(ok as never);

    const result = await deleteMirrorsForWorkshopSlot(admin, slotId);

    expect(result).toEqual({ error: null });
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceSlotId
    ).toHaveBeenCalledWith(admin, slotId);
  });

  it("deleteAllMirrorsForWorkshop deletes by source_workshop_id", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).mockResolvedValue(ok as never);

    const result = await deleteAllMirrorsForWorkshop(admin, workshopId);

    expect(result).toEqual({ error: null });
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).toHaveBeenCalledWith(admin, workshopId);
  });

  it("deleteMirrorsForWorkshopInstructor scopes by workshop and user", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopAndUser
    ).mockResolvedValue(ok as never);

    const result = await deleteMirrorsForWorkshopInstructor(
      admin,
      workshopId,
      instructorUserId
    );

    expect(result).toEqual({ error: null });
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopAndUser
    ).toHaveBeenCalledWith(admin, workshopId, instructorUserId);
  });

  it("deleteAllWorkshopEntitySlots deletes workshop entity rows", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord
    ).mockResolvedValue(ok as never);

    const result = await deleteAllWorkshopEntitySlots(admin, workshopId);

    expect(result).toEqual({ error: null });
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord
    ).toHaveBeenCalledWith(admin, "workshop", workshopId);
  });

  it("recopyAllMirrorsForWorkshop clears then inserts one batch", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).mockResolvedValue(ok as never);
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [{ user_id: instructorUserId }],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);
    mockListByRecord();
    mockBatchInstructorSlots();
    vi.mocked(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await recopyAllMirrorsForWorkshop(admin, workshopId);

    expect(result).toEqual({ error: null, count: 1 });
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).toHaveBeenCalledWith(admin, workshopId);
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).toHaveBeenCalledTimes(1);
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).toHaveBeenCalledWith(admin, [
      expect.objectContaining({
        record_id: instructorUserId,
        source_workshop_id: workshopId,
        source_slot_id: slotId,
        type: "busy",
      }),
    ]);
  });

  it("mirrorWorkshopSlotsToInstructor rejects overlapping instructor slots", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
    ).mockImplementation(async (_c, entityType) => {
      if (entityType === "workshop") {
        return {
          data: [workshopSlot],
          error: null,
          count: 1,
          status: 200,
          statusText: "OK",
        } as never;
      }
      return emptyList as never;
    });
    mockBatchInstructorSlots([
      {
        ...workshopSlot,
        id: "existing-busy",
        entity_type: "instructor",
        record_id: instructorUserId,
        name: "Other",
        type: "busy",
        source_workshop_id: null,
        source_slot_id: null,
      },
    ]);

    const result = await mirrorWorkshopSlotsToInstructor(
      admin,
      workshopId,
      instructorUserId
    );

    expect(result.error).toBe(
      "This time overlaps an existing schedule slot."
    );
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).not.toHaveBeenCalled();
  });
});
