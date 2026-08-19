import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  WORKSHOP_INSTRUCTOR_ROLES,
  WORKSHOP_OFFERING_TYPES,
  WORKSHOP_PAYMENT_METHODS,
  WORKSHOP_PAYMENT_TYPES,
  WORKSHOP_WAGE_TYPES,
} from "@/lib/constants/manager-workshop-display";
import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";
import { ROLES } from "@/lib/constants/roles";
import * as profileRepository from "@/repositories/profile.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as workshopDocumentRepository from "@/repositories/workshop-document.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopSessionRepository from "@/repositories/workshop-session.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  WORKSHOP_HAS_PAYMENTS_DELETE_ERROR,
  addWorkshopInstructorForManager,
  buildWorkshopPaymentSummary,
  buildWorkshopPaymentsTotals,
  changeWorkshopStatusForManager,
  createWorkshopForManager,
  createWorkshopPaymentForManager,
  deleteWorkshopDocumentForManager,
  deleteWorkshopForManager,
  deleteWorkshopPaymentForManager,
  getWorkshopForManager,
  listWorkshopsForManager,
  removeWorkshopInstructorForManager,
  renameWorkshopDocumentForManager,
  updateWorkshopForManager,
  updateWorkshopInstructorForManager,
  updateWorkshopPaymentForManager,
  uploadWorkshopDocumentForManager,
} from "@/services/workshops/workshop.service";

vi.mock("@/repositories/workshop.repository");
vi.mock("@/repositories/workshop-document.repository");
vi.mock("@/repositories/workshop-instructor.repository");
vi.mock("@/repositories/workshop-payment.repository");
vi.mock("@/repositories/workshop-session.repository");
vi.mock("@/repositories/workshop-storage.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/instructor-schedule-slot.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));

vi.mock("@/services/auth/authorization.service", () => ({
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
const assignmentId = "33333333-3333-4333-8333-333333333333";
const documentId = "44444444-4444-4444-8444-444444444444";
const paymentId = "55555555-5555-4555-8555-555555555555";

const workshopRecord = {
  id: workshopId,
  name: "Intro to UX",
  subject: "Design",
  status: WORKSHOP_STATUSES.DRAFT,
  type: WORKSHOP_OFFERING_TYPES.WORKSHOP,
  phone: "+961 71 234 567",
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

const instructorAssignmentRecord = {
  id: assignmentId,
  workshop_id: workshopId,
  user_id: instructorUserId,
  role: WORKSHOP_INSTRUCTOR_ROLES.LEAD,
  wage_type: WORKSHOP_WAGE_TYPES.FIXED,
  wage_amount: 500,
  notes: null,
  created_at: "2026-01-02T00:00:00.000Z",
  profiles: { username: "lead_teacher" },
};

const documentRecord = {
  id: documentId,
  workshop_id: workshopId,
  name: "Syllabus",
  storage_path: `workshops/${workshopId}/aaaa1111-bbbb-4ccc-8ddd-eeeeeeeeeeee-syllabus.pdf`,
  file_size: 1024,
  mime_type: "application/pdf",
  uploaded_by: actor.userId,
  created_at: "2026-01-03T00:00:00.000Z",
};

const paymentRecord = {
  id: paymentId,
  workshop_id: workshopId,
  amount: 100,
  type: WORKSHOP_PAYMENT_TYPES.CREDIT,
  payment_date: "2026-08-01",
  payment_method: WORKSHOP_PAYMENT_METHODS.CASH,
  notes: "Deposit",
  created_by: actor.userId,
  created_at: "2026-08-01T00:00:00.000Z",
};

function makePdfFile(name = "syllabus.pdf", sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, {
    type: "application/pdf",
  });
}

const validCreateInput = {
  name: "Intro to UX",
  type: WORKSHOP_OFFERING_TYPES.WORKSHOP,
  phone: "+961 71 234 567",
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

const validAddInstructorInput = {
  workshop_id: workshopId,
  user_id: instructorUserId,
  role: WORKSHOP_INSTRUCTOR_ROLES.LEAD,
  wage_type: WORKSHOP_WAGE_TYPES.FIXED,
  wage_amount: 500,
  notes: null,
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

  it("returns all workshops for manager", async () => {
    vi.mocked(workshopRepository.listWorkshops).mockResolvedValue({
      data: [workshopRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const workshops = await listWorkshopsForManager(
      adminClient,
      actor.userId,
      ROLES.MANAGER
    );

    expect(workshops).toHaveLength(1);
    expect(workshops[0]?.name).toBe("Intro to UX");
    expect(workshops[0]?.status).toBe(WORKSHOP_STATUSES.DRAFT);
    expect(workshopRepository.listWorkshops).toHaveBeenCalled();
    expect(profileRepository.findRoleById).not.toHaveBeenCalled();
  });

  it("returns all workshops for CEO", async () => {
    vi.mocked(workshopRepository.listWorkshops).mockResolvedValue({
      data: [workshopRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const workshops = await listWorkshopsForManager(
      adminClient,
      actor.userId,
      ROLES.CEO
    );

    expect(workshops).toHaveLength(1);
    expect(workshopRepository.listWorkshops).toHaveBeenCalled();
    expect(
      workshopInstructorRepository.listWorkshopInstructorsByUserId
    ).not.toHaveBeenCalled();
    expect(profileRepository.findRoleById).not.toHaveBeenCalled();
  });

  it("returns only assigned workshops for other roles", async () => {
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByUserId
    ).mockResolvedValue({
      data: [
        {
          id: assignmentId,
          workshop_id: workshopId,
          user_id: actor.userId,
          role: WORKSHOP_INSTRUCTOR_ROLES.LEAD,
          wage_type: WORKSHOP_WAGE_TYPES.FIXED,
          wage_amount: 500,
          notes: null,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.listWorkshopsByIds).mockResolvedValue({
      data: [workshopRecord],
      error: null,
    });

    const workshops = await listWorkshopsForManager(
      adminClient,
      actor.userId,
      ROLES.TEACHER
    );

    expect(workshops).toHaveLength(1);
    expect(workshopRepository.listWorkshopsByIds).toHaveBeenCalledWith(
      adminClient,
      [workshopId]
    );
    expect(workshopRepository.listWorkshops).not.toHaveBeenCalled();
    expect(profileRepository.findRoleById).not.toHaveBeenCalled();
  });

  it("falls back to profiles.role when actorRole is omitted", async () => {
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.MANAGER },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.listWorkshops).mockResolvedValue({
      data: [workshopRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const workshops = await listWorkshopsForManager(adminClient, actor.userId);

    expect(workshops).toHaveLength(1);
    expect(profileRepository.findRoleById).toHaveBeenCalledWith(
      adminClient,
      actor.userId
    );
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
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    } as never);

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
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).toHaveBeenCalledWith(adminClient, workshopId);
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord
    ).toHaveBeenCalledWith(adminClient, "workshop", workshopId);
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
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.MANAGER },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
  });

  it("returns workshop with payments, instructors, and candidates", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopPaymentRepository.listWorkshopPaymentsByWorkshopId
    ).mockResolvedValue({
      data: [
        paymentRecord,
        {
          ...paymentRecord,
          id: "66666666-6666-4666-8666-666666666666",
          amount: 20,
          type: WORKSHOP_PAYMENT_TYPES.DEBIT,
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [instructorAssignmentRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(profileRepository.listInstructorProfiles).mockResolvedValue({
      data: [
        {
          id: instructorUserId,
          username: "lead_teacher",
          role: "teacher",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "d4d5e6f7-a8b9-0123-def0-234567890123",
          username: "assistant_one",
          role: "teacher",
          is_instructor: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopDocumentRepository.listWorkshopDocumentsByWorkshopId
    ).mockResolvedValue({
      data: [documentRecord],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
    ).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopSessionRepository.listWorkshopSessionsByWorkshopId
    ).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      workshopRepository.countWorkshopPaymentsByWorkshopId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 2,
      status: 200,
      statusText: "OK",
    });

    const detail = await getWorkshopForManager(
      adminClient,
      actor.userId,
      workshopId
    );

    expect(detail?.payment_count).toBe(2);
    expect(detail?.payments).toEqual([]);
    expect(detail?.instructorCandidates).toEqual([]);
    expect(detail?.scheduleSlots).toEqual([]);
    expect(detail?.workshop.id).toBe(workshopId);
    expect(detail?.instructors).toHaveLength(1);
    expect(detail?.instructors[0]?.username).toBe("lead_teacher");
    expect(detail?.documents).toHaveLength(1);
    expect(detail?.documents[0]?.name).toBe("Syllabus");
    expect(detail?.sessions).toEqual([]);
    expect(
      workshopPaymentRepository.listWorkshopPaymentsByWorkshopId
    ).not.toHaveBeenCalled();
    expect(profileRepository.listInstructorProfiles).not.toHaveBeenCalled();
    expect(
      instructorScheduleSlotRepository.listInstructorScheduleSlotsByRecord
    ).not.toHaveBeenCalled();
  });

  it("returns null when a non-manager/CEO is not assigned to the workshop", async () => {
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.TEACHER },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const detail = await getWorkshopForManager(
      adminClient,
      actor.userId,
      workshopId
    );

    expect(detail).toBeNull();
    expect(workshopRepository.findWorkshopById).not.toHaveBeenCalled();
  });
});

describe("uploadWorkshopDocumentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is missing", async () => {
    const result = await uploadWorkshopDocumentForManager(
      adminClient,
      null,
      actor,
      {
        workshop_id: workshopId,
        file: makePdfFile(),
        name: "Syllabus",
      }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects disallowed mime types", async () => {
    const result = await uploadWorkshopDocumentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        workshop_id: workshopId,
        file: new File([new Uint8Array(10)], "bad.exe", {
          type: "application/octet-stream",
        }),
        name: "Bad",
      }
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.file?.[0]).toMatch(/not allowed/i);
    }
  });

  it("uploads to storage then inserts a document row", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopStorageRepository.uploadWorkshopStorageObject
    ).mockResolvedValue({ error: null });
    vi.mocked(
      workshopDocumentRepository.createWorkshopDocument
    ).mockResolvedValue({
      data: documentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await uploadWorkshopDocumentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        workshop_id: workshopId,
        file: makePdfFile(),
        name: "Syllabus",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.document.name).toBe("Syllabus");
      expect(result.message).toBe("Document uploaded.");
    }
    expect(
      workshopStorageRepository.uploadWorkshopStorageObject
    ).toHaveBeenCalled();
    expect(
      workshopDocumentRepository.createWorkshopDocument
    ).toHaveBeenCalled();
  });
});

describe("renameWorkshopDocumentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("renames display name only", async () => {
    vi.mocked(
      workshopDocumentRepository.findWorkshopDocumentById
    ).mockResolvedValue({
      data: documentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopDocumentRepository.updateWorkshopDocumentNameById
    ).mockResolvedValue({
      data: { ...documentRecord, name: "Updated syllabus" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await renameWorkshopDocumentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: documentId,
        workshop_id: workshopId,
        name: "Updated syllabus",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.document.name).toBe("Updated syllabus");
    }
  });
});

describe("deleteWorkshopDocumentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("removes storage object then deletes the row", async () => {
    vi.mocked(
      workshopDocumentRepository.findWorkshopDocumentById
    ).mockResolvedValue({
      data: documentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopStorageRepository.removeWorkshopStorageObjects
    ).mockResolvedValue({ error: null });
    vi.mocked(
      workshopDocumentRepository.deleteWorkshopDocumentById
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await deleteWorkshopDocumentForManager(
      adminClient,
      actor.userId,
      actor,
      { id: documentId, workshop_id: workshopId }
    );

    expect(result).toEqual({
      success: true,
      message: "Document deleted.",
    });
    expect(
      workshopStorageRepository.removeWorkshopStorageObjects
    ).toHaveBeenCalledWith(adminClient, [documentRecord.storage_path]);
    expect(
      workshopDocumentRepository.deleteWorkshopDocumentById
    ).toHaveBeenCalledWith(adminClient, documentId);
  });
});

describe("addWorkshopInstructorForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is missing", async () => {
    const result = await addWorkshopInstructorForManager(
      adminClient,
      null,
      actor,
      validAddInstructorInput
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects non-instructor profiles", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: instructorUserId,
        username: "not_instructor",
        role: "teacher",
        is_instructor: false,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await addWorkshopInstructorForManager(
      adminClient,
      actor.userId,
      actor,
      validAddInstructorInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/instructor/i);
    }
  });

  it("blocks duplicate assignments", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: instructorUserId,
        username: "lead_teacher",
        role: "teacher",
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser
    ).mockResolvedValue({
      data: instructorAssignmentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await addWorkshopInstructorForManager(
      adminClient,
      actor.userId,
      actor,
      validAddInstructorInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already assigned/i);
    }
  });

  it("adds an instructor", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: instructorUserId,
        username: "lead_teacher",
        role: "teacher",
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.createWorkshopInstructor
    ).mockResolvedValue({
      data: instructorAssignmentRecord,
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

    const result = await addWorkshopInstructorForManager(
      adminClient,
      actor.userId,
      actor,
      validAddInstructorInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.instructor.user_id).toBe(instructorUserId);
      expect(result.message).toBe("Instructor added.");
    }
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).not.toHaveBeenCalled();
  });

  it("mirrors workshop schedule slots as instructor busy slots", async () => {
    const workshopSlot = {
      id: "66666666-6666-4666-8666-666666666666",
      entity_type: "workshop",
      record_id: workshopId,
      name: "Session block",
      type: "busy",
      slot_date: "2026-09-01",
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "11:00:00",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: instructorUserId,
        username: "lead_teacher",
        role: "teacher",
        is_instructor: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.createWorkshopInstructor
    ).mockResolvedValue({
      data: instructorAssignmentRecord,
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
          data: [workshopSlot],
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
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await addWorkshopInstructorForManager(
      adminClient,
      actor.userId,
      actor,
      validAddInstructorInput
    );

    expect(result.success).toBe(true);
    expect(
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).toHaveBeenCalledWith(adminClient, [
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
        source_slot_id: workshopSlot.id,
      },
    ]);
  });
});

describe("updateWorkshopInstructorForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("updates role and wage", async () => {
    vi.mocked(
      workshopInstructorRepository.findWorkshopInstructorById
    ).mockResolvedValue({
      data: instructorAssignmentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopInstructorRepository.updateWorkshopInstructorById
    ).mockResolvedValue({
      data: {
        ...instructorAssignmentRecord,
        role: WORKSHOP_INSTRUCTOR_ROLES.ASSISTANT,
        wage_type: WORKSHOP_WAGE_TYPES.PERCENTAGE,
        wage_amount: 25,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const result = await updateWorkshopInstructorForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: assignmentId,
        workshop_id: workshopId,
        role: WORKSHOP_INSTRUCTOR_ROLES.ASSISTANT,
        wage_type: WORKSHOP_WAGE_TYPES.PERCENTAGE,
        wage_amount: 25,
        notes: null,
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.instructor.role).toBe(WORKSHOP_INSTRUCTOR_ROLES.ASSISTANT);
      expect(result.instructor.wage_amount).toBe(25);
    }
  });
});

describe("removeWorkshopInstructorForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("removes an assignment", async () => {
    vi.mocked(
      workshopInstructorRepository.findWorkshopInstructorById
    ).mockResolvedValue({
      data: instructorAssignmentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopAndUser
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 1,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      workshopInstructorRepository.deleteWorkshopInstructorById
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await removeWorkshopInstructorForManager(
      adminClient,
      actor.userId,
      actor,
      { id: assignmentId, workshop_id: workshopId }
    );

    expect(result).toEqual({
      success: true,
      message: "Instructor removed.",
    });
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopAndUser
    ).toHaveBeenCalledWith(adminClient, workshopId, instructorUserId);
  });
});

describe("changeWorkshopStatusForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    vi.mocked(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).mockResolvedValue({
      data: null,
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    } as never);
    vi.mocked(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 0,
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
      instructorScheduleSlotRepository.createInstructorScheduleSlots
    ).mockResolvedValue({
      data: [],
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    } as never);
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

  it("allows non-adjacent status jumps", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.updateWorkshopStatusById).mockResolvedValue({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.IN_PROGRESS },
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

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.workshop.status).toBe(WORKSHOP_STATUSES.IN_PROGRESS);
    }
  });

  it("allows move to scheduled without a start date", async () => {
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
    vi.mocked(workshopRepository.updateWorkshopStatusById).mockResolvedValue({
      data: {
        ...workshopRecord,
        status: WORKSHOP_STATUSES.SCHEDULED,
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

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.workshop.status).toBe(WORKSHOP_STATUSES.SCHEDULED);
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
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).toHaveBeenCalledWith(adminClient, workshopId);

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
    expect(
      workshopInstructorRepository.listWorkshopInstructorsByWorkshopId
    ).toHaveBeenCalledWith(adminClient, workshopId);
  });

  it("clears mirrors when completing a workshop", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.IN_PROGRESS },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.updateWorkshopStatusById).mockResolvedValue({
      data: { ...workshopRecord, status: WORKSHOP_STATUSES.COMPLETED },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await changeWorkshopStatusForManager(
      adminClient,
      actor.userId,
      actor,
      { id: workshopId, status: WORKSHOP_STATUSES.COMPLETED }
    );

    expect(result.success).toBe(true);
    expect(
      instructorScheduleSlotRepository.deleteInstructorScheduleSlotsBySourceWorkshopId
    ).toHaveBeenCalledWith(adminClient, workshopId);
  });

  it("stamps end_date to today when completing without an end date", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: {
        ...workshopRecord,
        status: WORKSHOP_STATUSES.IN_PROGRESS,
        end_date: null,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.updateWorkshopStatusById).mockResolvedValue({
      data: {
        ...workshopRecord,
        status: WORKSHOP_STATUSES.COMPLETED,
        end_date: "2026-08-04",
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
      { id: workshopId, status: WORKSHOP_STATUSES.COMPLETED }
    );

    expect(result.success).toBe(true);
    expect(workshopRepository.updateWorkshopStatusById).toHaveBeenCalledWith(
      adminClient,
      workshopId,
      WORKSHOP_STATUSES.COMPLETED,
      expect.objectContaining({ end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
    );
  });
});

describe("buildWorkshopPaymentSummary", () => {
  it("computes credits, debits, net, and remaining vs price", () => {
    const summary = buildWorkshopPaymentSummary(
      [
        {
          id: paymentId,
          workshop_id: workshopId,
          amount: 100,
          type: WORKSHOP_PAYMENT_TYPES.CREDIT,
          payment_date: "2026-08-01",
          payment_method: null,
          notes: null,
          created_by: null,
          created_at: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          workshop_id: workshopId,
          amount: 25,
          type: WORKSHOP_PAYMENT_TYPES.DEBIT,
          payment_date: "2026-08-02",
          payment_method: null,
          notes: null,
          created_by: null,
          created_at: "2026-08-02T00:00:00.000Z",
        },
      ],
      150
    );

    expect(summary).toEqual({
      credits: 100,
      debits: 25,
      net: 75,
      price: 150,
      remaining: 75,
    });
  });
});

describe("buildWorkshopPaymentsTotals", () => {
  it("aggregates credits, debits, net, and workshop coverage", () => {
    const totals = buildWorkshopPaymentsTotals([
      {
        id: paymentId,
        workshop_id: workshopId,
        workshop_name: "Alpha",
        amount: 100,
        type: WORKSHOP_PAYMENT_TYPES.CREDIT,
        payment_date: "2026-08-01",
        payment_method: null,
        notes: null,
        created_by: null,
        created_at: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        workshop_id: workshopId,
        workshop_name: "Alpha",
        amount: 25,
        type: WORKSHOP_PAYMENT_TYPES.DEBIT,
        payment_date: "2026-08-02",
        payment_method: null,
        notes: null,
        created_by: null,
        created_at: "2026-08-02T00:00:00.000Z",
      },
      {
        id: "77777777-7777-4777-8777-777777777777",
        workshop_id: "88888888-8888-4888-8888-888888888888",
        workshop_name: "Beta",
        amount: 40,
        type: WORKSHOP_PAYMENT_TYPES.CREDIT,
        payment_date: "2026-08-03",
        payment_method: null,
        notes: null,
        created_by: null,
        created_at: "2026-08-03T00:00:00.000Z",
      },
    ]);

    expect(totals).toEqual({
      credits: 140,
      debits: 25,
      net: 115,
      payment_count: 3,
      workshops_with_payments: 2,
    });
  });
});

describe("createWorkshopPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("returns unauthorized when actor is missing", async () => {
    const result = await createWorkshopPaymentForManager(
      adminClient,
      null,
      actor,
      {
        workshop_id: workshopId,
        amount: 100,
        type: WORKSHOP_PAYMENT_TYPES.CREDIT,
        payment_date: "2026-08-01",
        payment_method: null,
        notes: null,
      }
    );
    expect(result).toEqual({ success: false, error: "Unauthorized." });
  });

  it("rejects invalid amount", async () => {
    const result = await createWorkshopPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        workshop_id: workshopId,
        amount: 0,
        type: WORKSHOP_PAYMENT_TYPES.CREDIT,
        payment_date: "2026-08-01",
        payment_method: null,
        notes: null,
      }
    );
    expect(result.success).toBe(false);
  });

  it("creates a credit payment", async () => {
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopPaymentRepository.createWorkshopPayment).mockResolvedValue({
      data: paymentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createWorkshopPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        workshop_id: workshopId,
        amount: 100,
        type: WORKSHOP_PAYMENT_TYPES.CREDIT,
        payment_date: "2026-08-01",
        payment_method: WORKSHOP_PAYMENT_METHODS.CASH,
        notes: "Deposit",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toBe("Credit recorded.");
      expect(result.payment.amount).toBe(100);
    }
  });
});

describe("updateWorkshopPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("updates payment fields", async () => {
    vi.mocked(workshopPaymentRepository.findWorkshopPaymentById).mockResolvedValue({
      data: paymentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopPaymentRepository.updateWorkshopPaymentById
    ).mockResolvedValue({
      data: {
        ...paymentRecord,
        amount: 120,
        payment_method: WORKSHOP_PAYMENT_METHODS.CARD,
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await updateWorkshopPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      {
        id: paymentId,
        workshop_id: workshopId,
        amount: 120,
        type: WORKSHOP_PAYMENT_TYPES.CREDIT,
        payment_date: "2026-08-01",
        payment_method: WORKSHOP_PAYMENT_METHODS.CARD,
        notes: "Deposit",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.payment.amount).toBe(120);
      expect(result.payment.payment_method).toBe(WORKSHOP_PAYMENT_METHODS.CARD);
    }
  });
});

describe("deleteWorkshopPaymentForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
  });

  it("deletes a payment", async () => {
    vi.mocked(workshopPaymentRepository.findWorkshopPaymentById).mockResolvedValue({
      data: paymentRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(workshopRepository.findWorkshopById).mockResolvedValue({
      data: workshopRecord,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    vi.mocked(
      workshopPaymentRepository.deleteWorkshopPaymentById
    ).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await deleteWorkshopPaymentForManager(
      adminClient,
      actor.userId,
      actor,
      { id: paymentId, workshop_id: workshopId }
    );

    expect(result).toEqual({
      success: true,
      message: "Payment deleted.",
    });
  });
});
