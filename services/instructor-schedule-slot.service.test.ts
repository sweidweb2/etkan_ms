import { describe, expect, it, vi, beforeEach } from "vitest";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  createInstructorScheduleSlotForManager,
  deleteInstructorScheduleSlotForManager,
  getInstructorSchedulesPageForManager,
  listEligibleWorkshopsForInstructorScheduleForManager,
  updateInstructorScheduleSlotForManager,
} from "@/services/instructor-schedule-slot.service";
import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";

vi.mock("@/repositories/instructor-schedule-slot.repository");
vi.mock("@/repositories/workshop-instructor.repository");
vi.mock("@/repositories/workshop.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));

vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
  hasPermission: vi.fn(async (_c, userId) => Boolean(userId)),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const workshopId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";
const instructorUserId = "b2b3c4d5-e6f7-8901-bcde-f12345678901";
const slotId = "66666666-6666-4666-8666-666666666666";

const workshopRecord = {
  id: workshopId,
  name: "Intro to UX",
  subject: "Design",
  status: WORKSHOP_STATUSES.SCHEDULED,
  type: "workshop",
  phone: null,
  target_audience: null,
  nb_participants: null,
  proposal_notes: null,
  number_of_sessions: 4,
  price: 100,
  start_date: "2026-09-01",
  end_date: "2026-12-01",
  delivery_place: null,
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  deleted_at: null,
};

const createdWorkshopSlot = {
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

describe("createInstructorScheduleSlotForManager workshop fan-out", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("mirrors a new workshop slot to all instructors", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.createInstructorScheduleSlot
    ).mockResolvedValue({
      data: createdWorkshopSlot,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [{ user_id: instructorUserId }],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await createInstructorScheduleSlotForManager(
      adminClient,
      actor.userId,
      actor,
      {
        entity_type: "workshop",
        record_id: workshopId,
        name: "Session block",
        type: "busy",
        slot_date: "2026-09-01",
        start_time: "09:00",
        end_time: "11:00",
      }
    );

    expect(result.success).toBe(true);
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).toHaveBeenCalledWith(adminClient, [
      expect.objectContaining({
        entity_type: "instructor",
        record_id: instructorUserId,
        type: "busy",
        source_workshop_id: workshopId,
        source_slot_id: slotId,
      }),
    ]);
  });
});

describe("updateInstructorScheduleSlotForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("updates mirrors when a workshop slot changes", async () => {
    const updated = {
      ...createdWorkshopSlot,
      name: "Updated block",
      start_time: "10:00:00",
      end_time: "12:00:00",
    };

    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.findInstructorScheduleSlotById
    ).mockResolvedValue({
      data: createdWorkshopSlot,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.updateInstructorScheduleSlot
    ).mockResolvedValue({
      data: updated,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
    ).mockImplementation(async (_c, entityType) => {
      if (entityType === "workshop") {
        return {
          data: [createdWorkshopSlot],
          error: null,
          count: 1,
          status: 200,
          statusText: "OK",
        } as never;
      }
      return {
        data: [],
        error: null,
        count: 0,
        status: 200,
        statusText: "OK",
      } as never;
    });
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [{ user_id: instructorUserId }],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.updateInstructorScheduleSlotsBySourceSlotId
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateInstructorScheduleSlotForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: slotId,
        entity_type: "workshop",
        record_id: workshopId,
        name: "Updated block",
        type: "busy",
        slot_date: "1970-01-05",
        start_time: "10:00",
        end_time: "12:00",
      }
    );

    expect(result.success).toBe(true);
    expect(
      instructorScheduleSlotRepository.updateInstructorScheduleSlotsBySourceSlotId
    ).toHaveBeenCalledWith(
      adminClient,
      slotId,
      expect.objectContaining({
        name: "Updated block",
        type: "busy",
        start_time: "10:00:00",
        end_time: "12:00:00",
      })
    );
  });

  it("rolls back workshop slot when mirror update fails", async () => {
    const updated = {
      ...createdWorkshopSlot,
      name: "Updated block",
      start_time: "10:00:00",
      end_time: "12:00:00",
    };

    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.findInstructorScheduleSlotById
    ).mockResolvedValue({
      data: createdWorkshopSlot,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.updateInstructorScheduleSlot
    ).mockResolvedValue({
      data: updated,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
    ).mockImplementation(async (_c, entityType) => {
      if (entityType === "workshop") {
        return {
          data: [createdWorkshopSlot],
          error: null,
          count: 1,
          status: 200,
          statusText: "OK",
        } as never;
      }
      return {
        data: [],
        error: null,
        count: 0,
        status: 200,
        statusText: "OK",
      } as never;
    });
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [{ user_id: instructorUserId }],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.updateInstructorScheduleSlotsBySourceSlotId
    ).mockResolvedValue({
      data: null,
      error: { message: "mirror sync failed" },
      count: null,
      status: 500,
      statusText: "Error",
    } as never);

    const result = await updateInstructorScheduleSlotForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: slotId,
        entity_type: "workshop",
        record_id: workshopId,
        name: "Updated block",
        type: "busy",
        slot_date: "1970-01-05",
        start_time: "10:00",
        end_time: "12:00",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/mirror sync failed|Unable to sync/i);
    }
    expect(
      instructorScheduleSlotRepository.updateInstructorScheduleSlot
    ).toHaveBeenCalledTimes(2);
    expect(
      instructorScheduleSlotRepository.updateInstructorScheduleSlot
    ).toHaveBeenLastCalledWith(
      adminClient,
      slotId,
      expect.objectContaining({
        name: createdWorkshopSlot.name,
        start_time: "09:00",
        end_time: "11:00",
      })
    );
  });

  it("rejects editing a mirrored instructor slot", async () => {
    const mirrorId = "77777777-7777-4777-8777-777777777777";
    vi.mocked(
      instructorScheduleSlotRepository.findInstructorScheduleSlotById
    ).mockResolvedValue({
      data: {
        ...createdWorkshopSlot,
        id: mirrorId,
        entity_type: "instructor",
        record_id: instructorUserId,
        type: "busy",
        source_workshop_id: workshopId,
        source_slot_id: slotId,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateInstructorScheduleSlotForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: mirrorId,
        entity_type: "instructor",
        record_id: instructorUserId,
        name: "Session block",
        type: "busy",
        slot_date: "1970-01-05",
        start_time: "09:00",
        end_time: "11:00",
      }
    );

    expect(result).toEqual({
      success: false,
      error:
        "This slot is mirrored from a workshop schedule and cannot be edited here.",
    });
    expect(
      instructorScheduleSlotRepository.updateInstructorScheduleSlot
    ).not.toHaveBeenCalled();
  });
});

describe("deleteInstructorScheduleSlotForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("rejects deleting a mirrored instructor slot", async () => {
    vi.mocked(
      instructorScheduleSlotRepository.findInstructorScheduleSlotById
    ).mockResolvedValue({
      data: {
        ...createdWorkshopSlot,
        entity_type: "instructor",
        record_id: instructorUserId,
        type: "busy",
        source_workshop_id: workshopId,
        source_slot_id: slotId,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await deleteInstructorScheduleSlotForManager(
      adminClient,
      actor.userId,
      actor,
      "mirror-id"
    );

    expect(result).toEqual({
      success: false,
      error:
        "This slot is mirrored from a workshop schedule and cannot be deleted here.",
    });
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotById
    ).not.toHaveBeenCalled();
  });

  it("deletes mirrors before deleting a workshop slot", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.findInstructorScheduleSlotById
    ).mockResolvedValue({
      data: createdWorkshopSlot,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceSlotId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotById
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await deleteInstructorScheduleSlotForManager(
      adminClient,
      actor.userId,
      actor,
      slotId
    );

    expect(result.success).toBe(true);
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceSlotId
    ).toHaveBeenCalledWith(adminClient, slotId);
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotById
    ).toHaveBeenCalledWith(adminClient, slotId);
  });
});

describe("getInstructorSchedulesPageForManager fetch-all", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads all sessions and eligible workshops on page paint", async () => {
    const firstId = instructorUserId;
    const secondId = "c3c4d5e6-f7a8-9012-cdef-123456789012";
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue({
      data: [
        {
          id: firstId,
          username: "alice",
          role: "teacher",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: secondId,
          username: "bob",
          role: "teacher",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(workshopRepository.listWorkshopLockStatuses).mockResolvedValue({
      data: [{ id: workshopId, status: WORKSHOP_STATUSES.CANCELLED }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.listAllInstructorScheduleSlots
    ).mockResolvedValue({
      data: [
        {
          id: slotId,
          entity_type: "instructor",
          record_id: firstId,
          name: "Free morning",
          type: "free",
          slot_date: "2026-09-01",
          day_of_week: 1,
          start_time: "09:00:00",
          end_time: "11:00:00",
          source_workshop_id: null,
          source_slot_id: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(workshopRepository.listWorkshopsForScheduleTabs).mockResolvedValue({
      data: [
        {
          id: workshopId,
          name: "Intro to UX",
          status: WORKSHOP_STATUSES.SCHEDULED,
          start_date: "2026-09-01",
          end_date: "2026-12-01",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const data = await getInstructorSchedulesPageForManager(
      adminClient,
      actor.userId
    );

    expect(data.initialBrowse).toEqual({
      kind: "instructor",
      recordId: firstId,
    });
    expect(data.workshops).toHaveLength(1);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]?.recordId).toBe(firstId);
    expect(
      instructorScheduleSlotRepository.listAllInstructorScheduleSlots
    ).toHaveBeenCalledWith(adminClient, {
      excludeWorkshopRecordIds: [workshopId],
    });
    expect(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
    ).not.toHaveBeenCalled();
    expect(workshopRepository.listWorkshopsForScheduleTabs).toHaveBeenCalled();
  });
});

describe("listEligibleWorkshopsForInstructorScheduleForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns eligible workshops with slim schedule tabs query", async () => {
    vi.mocked(workshopRepository.listWorkshopsForScheduleTabs).mockResolvedValue({
      data: [
        {
          id: workshopId,
          name: "Intro to UX",
          status: WORKSHOP_STATUSES.SCHEDULED,
          start_date: "2026-09-01",
          end_date: "2026-12-01",
        },
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          name: "Done",
          status: WORKSHOP_STATUSES.COMPLETED,
          start_date: "2026-01-01",
          end_date: "2026-02-01",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const workshops = await listEligibleWorkshopsForInstructorScheduleForManager(
      adminClient,
      actor.userId
    );

    expect(workshops).toHaveLength(1);
    expect(workshops[0]?.id).toBe(workshopId);
    expect(workshops[0]?.eligible_for_create).toBe(true);
  });
});
