import { beforeEach, describe, expect, it, vi } from "vitest";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import {
  recalcNonCancelledSppsForPhase,
  recalcSppAndPhaseStatus,
} from "@/services/accounting/accounting-recalc.service";

vi.mock("@/repositories/student-payment-phase.repository");

const adminClient = {} as never;
const phaseId = "22222222-2222-4222-8222-222222222222";
const sppId = "33333333-3333-4333-8333-333333333333";

const sppRecord = {
  id: sppId,
  student_id: "44444444-4444-4444-8444-444444444444",
  payment_phase_id: phaseId,
  assigned_at: "2026-07-15T00:00:00.000Z",
  status: "paid",
  original_amount: 1000,
  adjustment_amount: 0,
  final_amount_due: 1000,
  total_paid: 1000,
  remaining_amount: 0,
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
};

describe("recalcSppAndPhaseStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the RPC SPP and phase status", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.recalcSppAndPhaseStatus
    ).mockResolvedValue({
      data: { spp: sppRecord, phaseStatus: "closed" },
      error: null,
    } as never);

    const result = await recalcSppAndPhaseStatus(adminClient, sppId);

    expect(result.spp.id).toBe(sppId);
    expect(result.phaseStatus).toBe("closed");
    expect(
      studentPaymentPhaseRepository.recalcSppAndPhaseStatus
    ).toHaveBeenCalledWith(adminClient, sppId);
  });

  it("throws when the RPC errors", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.recalcSppAndPhaseStatus
    ).mockResolvedValue({
      data: null,
      error: { message: "Unable to recalculate." },
    } as never);

    await expect(
      recalcSppAndPhaseStatus(adminClient, sppId)
    ).rejects.toThrow("Unable to recalculate.");
  });

  it("throws when the SPP is missing", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.recalcSppAndPhaseStatus
    ).mockResolvedValue({
      data: { spp: null, phaseStatus: "opened" },
      error: null,
    } as never);

    await expect(
      recalcSppAndPhaseStatus(adminClient, sppId)
    ).rejects.toThrow(/not found/i);
  });
});

describe("recalcNonCancelledSppsForPhase", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the RPC count and next phase status", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.recalcNonCancelledSppsForPhase
    ).mockResolvedValue({
      data: { sppRecalculated: 3, nextPhaseStatus: "opened" },
      error: null,
    } as never);

    const result = await recalcNonCancelledSppsForPhase(adminClient, phaseId);

    expect(result).toEqual({
      sppRecalculated: 3,
      nextPhaseStatus: "opened",
    });
    expect(
      studentPaymentPhaseRepository.recalcNonCancelledSppsForPhase
    ).toHaveBeenCalledWith(adminClient, phaseId);
  });

  it("throws when the RPC errors", async () => {
    vi.mocked(
      studentPaymentPhaseRepository.recalcNonCancelledSppsForPhase
    ).mockResolvedValue({
      data: null,
      error: { message: "Payment phase not found." },
    } as never);

    await expect(
      recalcNonCancelledSppsForPhase(adminClient, phaseId)
    ).rejects.toThrow("Payment phase not found.");
  });
});
