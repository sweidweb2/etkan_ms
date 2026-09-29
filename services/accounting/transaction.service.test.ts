import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import * as transactionRepository from "@/repositories/transaction.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { recordManagerAuditLog } from "@/services/ops/audit-log.service";
import {
  WORKSHOP_LINKED_TRANSACTION_DELETE_ERROR,
  deleteTransactionForManager,
} from "@/services/accounting/transaction.service";

vi.mock("@/repositories/transaction.repository");
vi.mock("@/repositories/workshop-payment.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  getUnauthorizedError: vi.fn(),
}));

const adminClient = {} as never;
const actor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};
const transactionId = "a1a2b3c4-d5e6-7890-abcd-ef1234567890";

const transactionRecord = {
  id: transactionId,
  transaction_date: "2026-09-01",
  type: "credit",
  amount: 100,
  description: "Donation",
  category: "donation",
  payment_method: "cash",
  recorded_by: "Manager",
  notes: null,
  created_at: "2026-09-01T00:00:00.000Z",
};

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

describe("deleteTransactionForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUnauthorizedError).mockResolvedValue(null);
    vi.mocked(recordManagerAuditLog).mockResolvedValue(null);
  });

  it("denies unauthorized actors", async () => {
    vi.mocked(getUnauthorizedError).mockResolvedValue("Unauthorized.");

    const result = await deleteTransactionForManager(
      adminClient,
      null,
      actor,
      { id: transactionId }
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(getUnauthorizedError).toHaveBeenCalledWith(
      adminClient,
      null,
      PERMISSIONS.ACCOUNTING_TRANSACTIONS_DELETE
    );
  });

  it("blocks workshop-linked transactions", async () => {
    vi.mocked(transactionRepository.findTransactionById).mockResolvedValue({
      data: transactionRecord,
      ...okResult,
    } as never);
    vi.mocked(
      workshopPaymentRepository.findWorkshopPaymentByTransactionId
    ).mockResolvedValue({
      data: { id: "payment-1" },
      ...okResult,
    } as never);

    const result = await deleteTransactionForManager(
      adminClient,
      actor.userId,
      actor,
      { id: transactionId }
    );

    expect(result).toEqual({
      success: false,
      error: WORKSHOP_LINKED_TRANSACTION_DELETE_ERROR,
    });
    expect(transactionRepository.deleteTransaction).not.toHaveBeenCalled();
  });

  it("deletes an external transaction and audits", async () => {
    vi.mocked(transactionRepository.findTransactionById).mockResolvedValue({
      data: transactionRecord,
      ...okResult,
    } as never);
    vi.mocked(
      workshopPaymentRepository.findWorkshopPaymentByTransactionId
    ).mockResolvedValue({
      data: null,
      ...okResult,
    } as never);
    vi.mocked(transactionRepository.deleteTransaction).mockResolvedValue({
      data: null,
      ...okResult,
    } as never);

    const result = await deleteTransactionForManager(
      adminClient,
      actor.userId,
      actor,
      { id: transactionId }
    );

    expect(result).toEqual({
      success: true,
      transactionId,
      message: "Transaction deleted.",
    });
    expect(transactionRepository.deleteTransaction).toHaveBeenCalledWith(
      adminClient,
      transactionId
    );
    expect(recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "delete",
        table_name: "transactions",
        record_id: transactionId,
      })
    );
  });
});
