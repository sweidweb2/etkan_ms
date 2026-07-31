import { describe, expect, it } from "vitest";
import {
  parseUpdatePaymentPhaseFormData,
  updatePaymentPhaseSchema,
} from "@/lib/validators/manager/update-payment-phase";
import {
  cancelPaymentPhaseSchema,
  parseCancelPaymentPhaseFormData,
} from "@/lib/validators/manager/cancel-payment-phase";

const validUpdate = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Fall tuition",
  amount: 1200,
  upfront_amount: 200,
  duration_months: 4,
  start_date: "2026-09-01",
  end_date: "2026-12-31",
};

describe("updatePaymentPhaseSchema", () => {
  it("accepts a valid payload", () => {
    expect(updatePaymentPhaseSchema.safeParse(validUpdate).success).toBe(true);
  });

  it("rejects end date before start date", () => {
    expect(
      updatePaymentPhaseSchema.safeParse({
        ...validUpdate,
        end_date: "2026-08-01",
      }).success
    ).toBe(false);
  });

  it("rejects upfront greater than amount", () => {
    expect(
      updatePaymentPhaseSchema.safeParse({
        ...validUpdate,
        upfront_amount: 1500,
      }).success
    ).toBe(false);
  });
});

describe("parseUpdatePaymentPhaseFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("id", validUpdate.id);
    formData.set("name", validUpdate.name);
    formData.set("amount", "1200");
    formData.set("upfront_amount", "200");
    formData.set("duration_months", "4");
    formData.set("start_date", validUpdate.start_date);
    formData.set("end_date", validUpdate.end_date);

    const parsed = parseUpdatePaymentPhaseFormData(formData);
    expect(parsed.success).toBe(true);
  });
});

describe("cancelPaymentPhaseSchema", () => {
  it("requires a payment phase id", () => {
    expect(cancelPaymentPhaseSchema.safeParse({}).success).toBe(false);
    expect(
      cancelPaymentPhaseSchema.safeParse({
        payment_phase_id: validUpdate.id,
      }).success
    ).toBe(true);
  });
});

describe("parseCancelPaymentPhaseFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("payment_phase_id", validUpdate.id);
    const parsed = parseCancelPaymentPhaseFormData(formData);
    expect(parsed.success).toBe(true);
  });
});
