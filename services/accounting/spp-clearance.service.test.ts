import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/auth/authorization.service", () => ({
  getUnauthorizedError: vi.fn(),
  assertPermission: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn(),
}));

vi.mock("@/repositories/student-payment-phase.repository", () => ({
  findSppById: vi.fn(),
  listSppsByPaymentPhaseId: vi.fn(),
}));

vi.mock("@/repositories/student-payment-phase-clearance.repository", () => ({
  findClearanceBySppId: vi.fn(),
  findClearanceById: vi.fn(),
  findClearancesBySppIds: vi.fn(),
  insertClearance: vi.fn(),
  updateClearance: vi.fn(),
  deleteClearanceById: vi.fn(),
  deleteClearancesBySppIds: vi.fn(),
  insertClearancesBulk: vi.fn(),
}));

import * as authorizationService from "@/services/auth/authorization.service";
import * as auditLogService from "@/services/ops/audit-log.service";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as clearanceRepository from "@/repositories/student-payment-phase-clearance.repository";
import {
  bulkCreateSppClearancesForManager,
  bulkDeleteSppClearancesForManager,
  createSppClearanceForManager,
  mapClearanceRecordToDto,
} from "@/services/accounting/spp-clearance.service";

const adminClient = {} as never;
const actor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
} as never;

const sppId = "33333333-3333-4333-8333-333333333333";
const phaseId = "22222222-2222-4222-8222-222222222222";

const pendingSpp = {
  id: sppId,
  student_id: "55555555-5555-4555-8555-555555555555",
  payment_phase_id: phaseId,
  status: "pending",
  original_amount: 350,
  adjustment_amount: 0,
  final_amount_due: 350,
  total_paid: 0,
  remaining_amount: 350,
  assigned_at: "2026-01-01",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("mapClearanceRecordToDto", () => {
  it("returns null when expired", () => {
    expect(
      mapClearanceRecordToDto({
        id: "c-1",
        student_payment_phase_id: "spp-1",
        duration_days: 1,
        notes: null,
        created_by: null,
        updated_by: null,
        created_at: "2020-01-01T00:00:00.000Z",
        updated_at: "2020-01-01T00:00:00.000Z",
      })
    ).toBeNull();
  });
});

describe("createSppClearanceForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(
      null
    );
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(
      undefined as never
    );
  });

  it("rejects paid SPPs", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: { ...pendingSpp, status: "paid" },
      error: null,
    } as never);

    const result = await createSppClearanceForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        duration_days: 30,
        notes: "",
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/paid/i);
    }
  });

  it("creates a clearance for pending SPP", async () => {
    vi.mocked(studentPaymentPhaseRepository.findSppById).mockResolvedValue({
      data: pendingSpp,
      error: null,
    } as never);
    vi.mocked(clearanceRepository.findClearanceBySppId).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    vi.mocked(clearanceRepository.insertClearance).mockResolvedValue({
      data: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        student_payment_phase_id: sppId,
        duration_days: 30,
        notes: null,
        created_by: actor.userId,
        updated_by: actor.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    } as never);

    const result = await createSppClearanceForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_payment_phase_id: sppId,
        duration_days: 30,
        notes: "",
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.clearance.duration_days).toBe(30);
      expect(result.message).toMatch(/Month paid/i);
    }
  });
});

describe("bulkCreateSppClearancesForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(
      null
    );
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(
      undefined as never
    );
  });

  it("skips paid and cancelled SPPs", async () => {
    const paidId = "44444444-4444-4444-8444-444444444444";
    const cancelledId = "66666666-6666-4666-8666-666666666666";
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [
        pendingSpp,
        { ...pendingSpp, id: paidId, status: "paid" },
        { ...pendingSpp, id: cancelledId, status: "cancelled" },
      ],
      error: null,
    } as never);
    vi.mocked(clearanceRepository.findClearancesBySppIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(clearanceRepository.insertClearancesBulk).mockResolvedValue({
      data: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          student_payment_phase_id: sppId,
          duration_days: 14,
          notes: null,
          created_by: actor.userId,
          updated_by: actor.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    } as never);

    const result = await bulkCreateSppClearancesForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId, duration_days: 14, notes: "" }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.created_count).toBe(1);
    }
    expect(clearanceRepository.insertClearancesBulk).toHaveBeenCalledWith(
      adminClient,
      [
        expect.objectContaining({
          student_payment_phase_id: sppId,
          duration_days: 14,
        }),
      ]
    );
  });
});

describe("bulkDeleteSppClearancesForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizationService.getUnauthorizedError).mockResolvedValue(
      null
    );
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(
      undefined as never
    );
  });

  it("removes clearances for SPPs that have them", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.listSppsByPaymentPhaseId
    ).mockResolvedValue({
      data: [pendingSpp],
      error: null,
    } as never);
    vi.mocked(clearanceRepository.findClearancesBySppIds).mockResolvedValue({
      data: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          student_payment_phase_id: sppId,
          duration_days: 14,
          notes: null,
          created_by: actor.userId,
          updated_by: actor.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    } as never);
    vi.mocked(clearanceRepository.deleteClearancesBySppIds).mockResolvedValue({
      data: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          student_payment_phase_id: sppId,
          duration_days: 14,
          notes: null,
          created_by: actor.userId,
          updated_by: actor.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    } as never);

    const result = await bulkDeleteSppClearancesForManager(
      adminClient,
      actor.userId,
      actor,
      { payment_phase_id: phaseId }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deleted_count).toBe(1);
    }
    expect(clearanceRepository.deleteClearancesBySppIds).toHaveBeenCalledWith(
      adminClient,
      [sppId]
    );
  });
});
