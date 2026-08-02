import { describe, expect, it, vi, beforeEach } from "vitest";
import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import * as auditLogService from "@/services/audit-log.service";
import type { AuditActor } from "@/services/audit-log.service";
import {
  WORKSHOP_HAS_PAYMENTS_DELETE_ERROR,
  changeWorkshopStatusForManager,
  createWorkshopForManager,
  deleteWorkshopForManager,
  getWorkshopForManager,
  listWorkshopsForManager,
  updateWorkshopForManager,
} from "@/services/workshop.service";

vi.mock("@/repositories/workshop.repository");
vi.mock("@/repositories/workshop-storage.repository");
vi.mock("@/services/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

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
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const workshopId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const workshopRecord = {
  id: workshopId,
  name: "Intro to UX",
  subject: "Design",
  status: WORKSHOP_STATUSES.DRAFT,
  target_audience: "Beginners",
  nb_participants: 20,
  proposal_notes: null,
  number_of_sessions: 4,
  price: 150,
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  delivery_place: "Main hall",
  created_by: actor.userId,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const validCreateInput = {
  name: "Intro to UX",
  subject: "Design",
  target_audience: "Beginners",
  proposal_notes: null,
  delivery_place: "Main hall",
  nb_participants: 20,
  number_of_sessions: 4,
  price: 150,
  start_date: "2026-09-01",
  end_date: "2026-09-30",
};

describe("listWorkshopsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is unauthorized", async () => {
    await expect(listWorkshopsForManager(adminClient, null)).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("returns workshops", async () => {
    vi.mocked(workshopRepository.listWorkshops).mockResolvedValue({
      data: [workshopRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const workshops = await listWorkshopsForManager(adminClient, actor.userId);

    expect(workshops).toHaveLength(1);
    expect(workshops[0]?.name).toBe("Intro to UX");
    expect(workshops[0]?.status).toBe(WORKSHOP_STATUSES.DRAFT);
  });
});

describe("createWorkshopForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is missing", async () => {
    const result = await createWorkshopForManager(
      adminClient,
      null,
      actor,
      validCreateInput
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("returns validation errors for invalid input", async () => {
    const result = await createWorkshopForManager(
      adminClient,
      actor.userId,
      actor,
      { ...validCreateInput, name: "" }
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("creates a workshop as draft", async () => {
    vi.mocked(workshopRepository.createWorkshop).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });

    const result = await createWorkshopForManager(
      adminClient,
      actor.userId,
      actor,
      validCreateInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.workshop.status).toBe(WORKSHOP_STATUSES.DRAFT);
      expect(result.message).toBe("Workshop created.");
    }
    expect(workshopRepository.createWorkshop).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        status: WORKSHOP_STATUSES.DRAFT,
        created_by: actor.userId,
        name: "Intro to UX",
      })
    );
  });
});

describe("updateWorkshopForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is missing", async () => {
    const result = await updateWorkshopForManager(adminClient, null, actor, {
      id: workshopId,
      ...validCreateInput,
    });
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("updates a workshop without changing status", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.updateWorkshopById).mockResolvedValue({
      data: { ...workshopRecord, name: "Advanced UX" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateWorkshopForManager(
      adminClient,
      actor.userId,
      actor,
      { id: workshopId, ...validCreateInput, name: "Advanced UX" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.workshop.name).toBe("Advanced UX");
    }
  });
});

describe("deleteWorkshopForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is missing", async () => {
    const result = await deleteWorkshopForManager(
      adminClient,
      null,
      actor,
      workshopId
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("refuses delete when payments exist", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopRepository.countWorkshopPaymentsByWorkshopId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 2,
      status: 200,
      statusText: "OK",
    });

    const result = await deleteWorkshopForManager(
      adminClient,
      actor.userId,
      actor,
      workshopId
    );

    expect(result).toEqual({
      success: false,
      error: WORKSHOP_HAS_PAYMENTS_DELETE_ERROR,
    });
    expect(workshopRepository.deleteWorkshopById).not.toHaveBeenCalled();
  });

  it("deletes workshop after storage cleanup when no payments", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopRepository.countWorkshopPaymentsByWorkshopId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopRepository.listWorkshopDocumentStoragePaths
    ).mockResolvedValue({
      data: [{ storage_path: "workshops/w1/doc.pdf" }],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopStorageRepository.removeWorkshopStorageObjects
    ).mockResolvedValue({ error: null });
    vi.mocked(workshopRepository.deleteWorkshopById).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await deleteWorkshopForManager(
      adminClient,
      actor.userId,
      actor,
      workshopId
    );

    expect(result).toEqual({
      success: true,
      message: "Workshop deleted.",
    });
    expect(
      workshopStorageRepository.removeWorkshopStorageObjects
    ).toHaveBeenCalledWith(adminClient, ["workshops/w1/doc.pdf"]);
    expect(workshopRepository.deleteWorkshopById).toHaveBeenCalledWith(
      adminClient,
      workshopId
    );
  });
});

describe("getWorkshopForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns workshop with payment_count", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopRepository.countWorkshopPaymentsByWorkshopId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 3,
      status: 200,
      statusText: "OK",
    });

    const detail = await getWorkshopForManager(
      adminClient,
      actor.userId,
      workshopId
    );

    expect(detail?.payment_count).toBe(3);
    expect(detail?.workshop.id).toBe(workshopId);
  });
});

describe("changeWorkshopStatusForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is missing", async () => {
    const result = await changeWorkshopStatusForManager(
      adminClient,
      null,
      actor,
      { id: workshopId, status: WORKSHOP_STATUSES.PROPOSAL }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects non-adjacent status jumps", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await changeWorkshopStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: workshopId, status: WORKSHOP_STATUSES.IN_PROGRESS }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/one step/i);
    }
  });

  it("rejects move to scheduled without a future start date", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: {
        ...workshopRecord,
        status: WORKSHOP_STATUSES.PROPOSAL,
        start_date: null,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await changeWorkshopStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: workshopId, status: WORKSHOP_STATUSES.SCHEDULED }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/start date/i);
    }
  });

  it("advances to the next status", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.updateWorkshopStatusById).mockResolvedValue({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.PROPOSAL },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await changeWorkshopStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: workshopId, status: WORKSHOP_STATUSES.PROPOSAL }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.workshop.status).toBe(WORKSHOP_STATUSES.PROPOSAL);
    }
  });

  it("cancels and reopens as draft", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValueOnce({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.PROPOSAL },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.updateWorkshopStatusById).mockResolvedValueOnce({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.CANCELLED },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const cancelResult = await changeWorkshopStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: workshopId, status: WORKSHOP_STATUSES.CANCELLED }
    );
    expect(cancelResult.success).toBe(true);

    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValueOnce({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.CANCELLED },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.updateWorkshopStatusById).mockResolvedValueOnce({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.DRAFT },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const reopenResult = await changeWorkshopStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: workshopId, status: WORKSHOP_STATUSES.DRAFT }
    );
    expect(reopenResult.success).toBe(true);
    if (reopenResult.success) {
      expect(reopenResult.workshop.status).toBe(WORKSHOP_STATUSES.DRAFT);
    }
  });
});
