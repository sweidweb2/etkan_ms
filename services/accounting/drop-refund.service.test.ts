import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import * as semesterDropRequestRepository from "@/repositories/semester-drop-request.repository";
import * as authorization from "@/services/auth/authorization.service";
import { waiveDropRefundForManager } from "@/services/accounting/drop-refund.service";
import type { AuditActor } from "@/services/ops/audit-log.service";

vi.mock("@/repositories/semester-drop-request.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  getUnauthorizedError: vi.fn(),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};
const requestId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

describe("waiveDropRefundForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requires accounting.drop_refunds.waive", async () => {
    vi.mocked(authorization.getUnauthorizedError).mockResolvedValue(
      "Unauthorized."
    );

    const result = await waiveDropRefundForManager(
      adminClient,
      actor.userId,
      actor,
      { request_id: requestId }
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(authorization.getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      actor.userId,
      PERMISSIONS.ACCOUNTING_DROP_REFUNDS_WAIVE
    );
    expect(
      semesterDropRequestRepository.waiveSemesterDropRefund
    ).not.toHaveBeenCalled();
  });

  it("maps known SQL errors to safe messages", async () => {
    vi.mocked(authorization.getUnauthorizedError).mockResolvedValue(null);
    vi.mocked(
      semesterDropRequestRepository.waiveSemesterDropRefund
    ).mockResolvedValue({
      data: null,
      error: { message: "Only owed drop refunds can be waived." },
    });

    const result = await waiveDropRefundForManager(
      adminClient,
      actor.userId,
      actor,
      { request_id: requestId }
    );

    expect(result).toEqual({
      success: false,
      error: "Only owed drop refunds can be waived.",
    });
  });

  it("hides unrelated SQL details behind a generic message", async () => {
    vi.mocked(authorization.getUnauthorizedError).mockResolvedValue(null);
    vi.mocked(
      semesterDropRequestRepository.waiveSemesterDropRefund
    ).mockResolvedValue({
      data: null,
      error: { message: "permission denied for table semester_drop_requests" },
    });

    const result = await waiveDropRefundForManager(
      adminClient,
      actor.userId,
      actor,
      { request_id: requestId }
    );

    expect(result).toEqual({
      success: false,
      error: "Unable to waive drop refund.",
    });
  });
});
