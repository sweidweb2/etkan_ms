import { describe, expect, it, vi, beforeEach } from "vitest";
import * as guestRepository from "@/repositories/guest.repository";
import * as guestStatusEventRepository from "@/repositories/guest-status-event.repository";
import * as inviteRepository from "@/repositories/guest-registration-invite.repository";
import * as registrationRepository from "@/repositories/student-registration-application.repository";
import * as documentRepository from "@/repositories/student-registration-document.repository";
import * as registrationStorage from "@/repositories/registration-storage.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  createGuestForManager,
  deleteGuestForManager,
  getGuestDetailForManager,
  getGuestForManager,
  listGuestsForManager,
  removeGuestStatusForManager,
  setGuestProfileStatusForManager,
  setGuestStatusForManager,
  setGuestStatusesForManager,
  updateGuestForManager,
} from "@/services/guests/guest.service";
import { getGuestRegistrationInviteBundleForManager } from "@/services/guests/guest-registration.service";

vi.mock("@/repositories/guest.repository");
vi.mock("@/repositories/guest-status-event.repository");
vi.mock("@/repositories/guest-registration-invite.repository");
vi.mock("@/repositories/student-registration-application.repository");
vi.mock("@/repositories/student-registration-document.repository");
vi.mock("@/repositories/registration-storage.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/guests/guest-registration.service", () => ({
  getGuestRegistrationInviteBundleForManager: vi.fn(),
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
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const guestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const guestRecord = {
  id: guestId,
  full_name: "Ada Lovelace",
  phone: "+96171111111",
  age: 22,
  school_or_university: "AUB",
  education_level: "uni_year_3",
  interested_service: "etkan_roadmap",
  status: "scheduled",
  notes: null,
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const validCreateInput = {
  full_name: "Ada Lovelace",
  phone: "+96171111111",
  age: 22,
  school_or_university: "AUB",
  education_level: "uni_year_3" as const,
  interested_service: "etkan_roadmap" as const,
  notes: null,
};

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

describe("listGuestsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is unauthorized", async () => {
    await expect(listGuestsForManager(adminClient, null)).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("returns mapped guests", async () => {
    vi.mocked(guestRepository.listGuests).mockResolvedValue({
      data: [guestRecord],
      ...okResult,
    });

    const guests = await listGuestsForManager(adminClient, actor.userId);
    expect(guests).toHaveLength(1);
    expect(guests[0]?.full_name).toBe("Ada Lovelace");
    expect(guests[0]?.status).toBe("scheduled");
  });
});

describe("getGuestForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when guest is missing", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: null,
      ...okResult,
    });

    await expect(
      getGuestForManager(adminClient, actor.userId, guestId)
    ).resolves.toBeNull();
  });
});

describe("createGuestForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await createGuestForManager(
      adminClient,
      null,
      actor,
      validCreateInput
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("creates guest as scheduled without a pipeline event", async () => {
    vi.mocked(guestRepository.createGuest).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });

    const result = await createGuestForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result.success).toBe(true);
    expect(guestRepository.createGuest).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        status: "scheduled",
        created_by: actor.userId,
      })
    );
    expect(
      guestStatusEventRepository.createGuestStatusEvent
    ).not.toHaveBeenCalled();
  });

  it("creates guest as pending when requested", async () => {
    vi.mocked(guestRepository.createGuest).mockResolvedValue({
      data: { ...guestRecord, status: "pending" },
      ...okResult,
    });

    const result = await createGuestForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, status: "pending" }
    );

    expect(result.success).toBe(true);
    expect(guestRepository.createGuest).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        status: "pending",
        created_by: actor.userId,
      })
    );
    expect(
      guestStatusEventRepository.createGuestStatusEvent
    ).not.toHaveBeenCalled();
  });
});

describe("updateGuestForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates intake fields", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(guestRepository.updateGuest).mockResolvedValue({
      data: { ...guestRecord, full_name: "Ada L." },
      ...okResult,
    });

    const result = await updateGuestForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: guestId,
        ...validCreateInput,
        full_name: "Ada L.",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.full_name).toBe("Ada L.");
    }
  });
});

describe("deleteGuestForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("hard-deletes an existing guest after cleaning related files", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [],
      ...okResult,
    });
    vi.mocked(inviteRepository.findInviteByGuestId).mockResolvedValue({
      data: {
        id: "invite-1",
        guest_id: guestId,
        token: "token",
        application_id: "app-1",
        created_by: actor.userId,
        created_at: "2026-01-01T00:00:00.000Z",
        used_at: null,
        cancelled_at: null,
      },
      ...okResult,
    });
    vi.mocked(
      registrationRepository.listApplicationIdsByGuestId
    ).mockResolvedValue({
      data: [{ id: "app-1" }],
      ...okResult,
    });
    vi.mocked(
      documentRepository.listStudentRegistrationDocumentsByApplicationIds
    ).mockResolvedValue({
      data: [
        {
          id: "doc-1",
          application_id: "app-1",
          storage_path: "registration/app-1/id.pdf",
          file_name: "id.pdf",
          mime_type: "application/pdf",
          file_size: 12,
          sort_order: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(
      registrationStorage.removeRegistrationStorageObjects
    ).mockResolvedValue({ error: null });
    vi.mocked(guestRepository.deleteGuestById).mockResolvedValue({
      data: null,
      ...okResult,
    });

    const result = await deleteGuestForManager(
      adminClient,
      actor.userId,
      actor,
      guestId
    );

    expect(result).toEqual({
      success: true,
      message: "Guest deleted.",
    });
    expect(
      registrationStorage.removeRegistrationStorageObjects
    ).toHaveBeenCalledWith(adminClient, ["registration/app-1/id.pdf"]);
    expect(guestRepository.deleteGuestById).toHaveBeenCalledWith(
      adminClient,
      guestId
    );
  });
});

describe("getGuestDetailForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getGuestRegistrationInviteBundleForManager).mockResolvedValue({
      invite: null,
      application: null,
    });
  });

  it("returns guest with status events newest first", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [
        {
          id: "event-2",
          guest_id: guestId,
          status: "finished_meeting",
          note: "Done",
          created_by: actor.userId,
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "event-1",
          guest_id: guestId,
          status: "started",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      ...okResult,
    });

    const detail = await getGuestDetailForManager(
      adminClient,
      actor.userId,
      guestId
    );

    expect(detail?.guest.id).toBe(guestId);
    expect(detail?.statusEvents.map((event) => event.id)).toEqual([
      "event-2",
      "event-1",
    ]);
    expect(detail?.registrationInvite).toBeNull();
    expect(detail?.registrationApplication).toBeNull();
  });
});

describe("setGuestStatusForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await setGuestStatusForManager(adminClient, null, actor, {
      id: guestId,
      status: "finished",
      note: null,
    });
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects pipeline writes unless the guest is pending", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });

    const result = await setGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "started", note: null }
    );

    expect(result).toEqual({
      success: false,
      error:
        "Pipeline statuses can only be recorded while the guest is pending.",
    });
    expect(
      guestStatusEventRepository.createGuestStatusEvent
    ).not.toHaveBeenCalled();
  });

  it("records pipeline finished and sets profile to finished", async () => {
    const pendingGuest = { ...guestRecord, status: "pending" };
    const finishedGuest = { ...pendingGuest, status: "finished" };
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: pendingGuest,
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [],
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.createGuestStatusEvent
    ).mockResolvedValue({
      data: {
        id: "event-3",
        guest_id: guestId,
        status: "finished",
        note: "Routed",
        created_by: actor.userId,
        created_at: "2026-01-03T00:00:00.000Z",
      },
      ...okResult,
    });
    vi.mocked(guestRepository.updateGuestStatus).mockResolvedValue({
      data: finishedGuest,
      ...okResult,
    });

    const result = await setGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "finished", note: "Routed" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.status).toBe("finished");
      expect(result.message).toMatch(/marked finished/i);
    }
    expect(guestRepository.updateGuestStatus).toHaveBeenCalledWith(
      adminClient,
      guestId,
      "finished"
    );
  });

  it("rejects profile outcomes as pipeline events", async () => {
    const result = await setGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "dropped" as never, note: null }
    );

    expect(result.success).toBe(false);
    expect(
      guestStatusEventRepository.createGuestStatusEvent
    ).not.toHaveBeenCalled();
  });

  it("records a second progress node without flipping profile status", async () => {
    const pendingGuest = { ...guestRecord, status: "pending" };
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: pendingGuest,
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [
        {
          id: "event-2",
          guest_id: guestId,
          status: "finished_meeting",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.createGuestStatusEvent
    ).mockResolvedValue({
      data: {
        id: "event-branch",
        guest_id: guestId,
        status: "finished_parent_meeting",
        note: null,
        created_by: actor.userId,
        created_at: "2026-01-03T00:00:00.000Z",
      },
      ...okResult,
    });

    const result = await setGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "finished_parent_meeting", note: null }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.status).toBe("pending");
    }
    expect(guestRepository.updateGuestStatus).not.toHaveBeenCalled();
    expect(
      guestStatusEventRepository.createGuestStatusEvent
    ).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ status: "finished_parent_meeting" })
    );
  });

  it("skips insert when the pipeline node was already recorded", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "pending" },
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [
        {
          id: "event-1",
          guest_id: guestId,
          status: "started",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "event-2",
          guest_id: guestId,
          status: "finished_meeting",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "event-3",
          guest_id: guestId,
          status: "chose_plan",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-03T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.createGuestStatusEvent
    ).mockResolvedValue({
      data: {
        id: "event-branch",
        guest_id: guestId,
        status: "finished_parent_meeting",
        note: null,
        created_by: actor.userId,
        created_at: "2026-01-04T00:00:00.000Z",
      },
      ...okResult,
    });

    const result = await setGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "finished_meeting", note: null }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.status).toBe("pending");
      expect(result.message).toBe("This status was already recorded.");
    }
    expect(
      guestStatusEventRepository.createGuestStatusEvent
    ).not.toHaveBeenCalled();
    expect(guestRepository.updateGuestStatus).not.toHaveBeenCalled();
  });

  it("returns error when event insert fails", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "pending" },
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [],
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.createGuestStatusEvent
    ).mockResolvedValue({
      data: null,
      error: { message: "fail" } as never,
      count: null,
      status: 500,
      statusText: "Error",
    });

    const result = await setGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "started", note: null }
    );

    expect(result.success).toBe(false);
    expect(guestRepository.updateGuestStatus).not.toHaveBeenCalled();
  });
});

describe("setGuestStatusesForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("records multiple unmade pipeline statuses", async () => {
    const pendingGuest = { ...guestRecord, status: "pending" };
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: pendingGuest,
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [
        {
          id: "event-1",
          guest_id: guestId,
          status: "started",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.createGuestStatusEvents
    ).mockResolvedValue({
      data: [
        {
          id: "event-new-1",
          guest_id: guestId,
          status: "chose_plan",
          note: "Catch up",
          created_by: actor.userId,
          created_at: "2026-01-04T00:00:00.000Z",
        },
        {
          id: "event-new-2",
          guest_id: guestId,
          status: "routed_correctly",
          note: "Catch up",
          created_by: actor.userId,
          created_at: "2026-01-05T00:00:00.000Z",
        },
      ],
      ...okResult,
    });

    const result = await setGuestStatusesForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: guestId,
        statuses: ["started", "chose_plan", "routed_correctly"],
        note: "Catch up",
      }
    );

    expect(result.success).toBe(true);
    expect(
      guestStatusEventRepository.createGuestStatusEvents
    ).toHaveBeenCalledTimes(1);
    expect(guestRepository.updateGuestStatus).not.toHaveBeenCalled();
  });

  it("records finished among a bulk selection and sets profile to finished", async () => {
    const pendingGuest = { ...guestRecord, status: "pending" };
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: pendingGuest,
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [],
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.createGuestStatusEvents
    ).mockResolvedValue({
      data: [
        {
          id: "event-started",
          guest_id: guestId,
          status: "started",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-03T00:00:00.000Z",
        },
        {
          id: "event-new",
          guest_id: guestId,
          status: "finished",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-04T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(guestRepository.updateGuestStatus).mockResolvedValue({
      data: { ...pendingGuest, status: "finished" },
      ...okResult,
    });

    const result = await setGuestStatusesForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, statuses: ["started", "finished"], note: null }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.status).toBe("finished");
    }
    expect(guestRepository.updateGuestStatus).toHaveBeenCalledWith(
      adminClient,
      guestId,
      "finished"
    );
  });

  it("records pipeline finished without flipping profile when asked", async () => {
    const pendingGuest = { ...guestRecord, status: "pending" };
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: pendingGuest,
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [],
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.createGuestStatusEvents
    ).mockResolvedValue({
      data: [
        {
          id: "event-started",
          guest_id: guestId,
          status: "started",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-03T00:00:00.000Z",
        },
        {
          id: "event-new",
          guest_id: guestId,
          status: "finished",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-04T00:00:00.000Z",
        },
      ],
      ...okResult,
    });

    const result = await setGuestStatusesForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: guestId,
        statuses: ["finished"],
        note: null,
        finishProfileOnPipelineFinished: false,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.status).toBe("pending");
    }
    expect(guestRepository.updateGuestStatus).not.toHaveBeenCalled();
  });
});

describe("setGuestProfileStatusForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await setGuestProfileStatusForManager(
      adminClient,
      null,
      actor,
      { id: guestId, status: "pending", note: null }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("updates profile status without writing pipeline events", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });
    vi.mocked(guestRepository.updateGuestStatus).mockResolvedValue({
      data: { ...guestRecord, status: "pending" },
      ...okResult,
    });

    const result = await setGuestProfileStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "pending", note: null }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.status).toBe("pending");
    }
    expect(guestRepository.updateGuestStatus).toHaveBeenCalledWith(
      adminClient,
      guestId,
      "pending"
    );
    expect(
      guestStatusEventRepository.createGuestStatusEvent
    ).not.toHaveBeenCalled();
  });
});

describe("removeGuestStatusForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies unauthorized actors", async () => {
    const result = await removeGuestStatusForManager(adminClient, null, actor, {
      id: guestId,
      status: "finished_meeting",
    });
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects pipeline deletes unless the guest is pending or finished", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: guestRecord,
      ...okResult,
    });

    const result = await removeGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "started" }
    );

    expect(result).toEqual({
      success: false,
      error:
        "Pipeline statuses can only be removed while the guest is pending or finished.",
    });
  });

  it("rejects when status was never recorded", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "pending" },
      ...okResult,
    });
    vi.mocked(
      guestStatusEventRepository.listGuestStatusEventsByGuestId
    ).mockResolvedValue({
      data: [
        {
          id: "event-1",
          guest_id: guestId,
          status: "started",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      ...okResult,
    });

    const result = await removeGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "finished_meeting" }
    );

    expect(result).toEqual({
      success: false,
      error: "This status is not recorded for this guest.",
    });
  });

  it("deletes matching history rows without changing profile status", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "pending" },
      ...okResult,
    });
    vi.mocked(guestStatusEventRepository.listGuestStatusEventsByGuestId)
      .mockResolvedValue({
        data: [
          {
            id: "event-3",
            guest_id: guestId,
            status: "chose_plan",
            note: null,
            created_by: actor.userId,
            created_at: "2026-01-03T00:00:00.000Z",
          },
          {
            id: "event-2",
            guest_id: guestId,
            status: "finished_meeting",
            note: "Met",
            created_by: actor.userId,
            created_at: "2026-01-02T00:00:00.000Z",
          },
          {
            id: "event-1",
            guest_id: guestId,
            status: "started",
            note: null,
            created_by: actor.userId,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        ...okResult,
      });
    vi.mocked(
      guestStatusEventRepository.deleteGuestStatusEventsByGuestIdAndStatus
    ).mockResolvedValue({
      data: [
        {
          id: "event-3",
          guest_id: guestId,
          status: "chose_plan",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-03T00:00:00.000Z",
        },
      ],
      ...okResult,
    });

    const result = await removeGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: guestId,
        status: "chose_plan",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.removedStatus).toBe("chose_plan");
      expect(result.guest.status).toBe("pending");
      expect(result.statusEvents).toHaveLength(2);
      expect(result.message).toBe("Status removed from history.");
    }
    expect(
      guestStatusEventRepository.deleteGuestStatusEventsByGuestIdAndStatus
    ).toHaveBeenCalledWith(adminClient, guestId, "chose_plan");
    expect(guestRepository.updateGuestStatus).not.toHaveBeenCalled();
  });

  it("reopens a finished guest to pending when a pipeline status is removed", async () => {
    const finishedGuest = { ...guestRecord, status: "finished" };
    const pendingGuest = { ...guestRecord, status: "pending" };
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: finishedGuest,
      ...okResult,
    });
    vi.mocked(guestStatusEventRepository.listGuestStatusEventsByGuestId)
      .mockResolvedValue({
        data: [
          {
            id: "event-finished",
            guest_id: guestId,
            status: "finished",
            note: null,
            created_by: actor.userId,
            created_at: "2026-01-04T00:00:00.000Z",
          },
          {
            id: "event-1",
            guest_id: guestId,
            status: "started",
            note: null,
            created_by: actor.userId,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        ...okResult,
      });
    vi.mocked(
      guestStatusEventRepository.deleteGuestStatusEventsByGuestIdAndStatus
    ).mockResolvedValue({
      data: [
        {
          id: "event-finished",
          guest_id: guestId,
          status: "finished",
          note: null,
          created_by: actor.userId,
          created_at: "2026-01-04T00:00:00.000Z",
        },
      ],
      ...okResult,
    });
    vi.mocked(guestRepository.updateGuestStatus).mockResolvedValue({
      data: pendingGuest,
      ...okResult,
    });

    const result = await removeGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "finished" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.guest.status).toBe("pending");
      expect(result.message).toBe(
        "Status removed. Guest moved back to pending."
      );
    }
    expect(guestRepository.updateGuestStatus).toHaveBeenCalledWith(
      adminClient,
      guestId,
      "pending"
    );
  });

  it("keeps cancelled guests locked from pipeline deletes", async () => {
    vi.mocked(guestRepository.findGuestById).mockResolvedValue({
      data: { ...guestRecord, status: "cancelled" },
      ...okResult,
    });

    const result = await removeGuestStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: guestId, status: "started" }
    );

    expect(result).toEqual({
      success: false,
      error:
        "Pipeline statuses can only be removed while the guest is pending or finished.",
    });
    expect(
      guestStatusEventRepository.deleteGuestStatusEventsByGuestIdAndStatus
    ).not.toHaveBeenCalled();
  });
});
