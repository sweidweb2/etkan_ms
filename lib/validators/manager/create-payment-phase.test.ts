import { describe, expect, it } from "vitest";
import {
  createPaymentPhaseSchema,
  parseCreatePaymentPhaseFormData,
} from "@/lib/validators/manager/create-payment-phase";

const validInput = {
  name: "Fall tuition",
  class_id: "11111111-1111-4111-8111-111111111111",
  amount: 1000,
  upfront_amount: 200,
  duration_months: 4,
  start_date: "2026-09-01",
  end_date: "2026-12-31",
};

describe("createPaymentPhaseSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = createPaymentPhaseSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects end date before start date", () => {
    const parsed = createPaymentPhaseSchema.safeParse({
      ...validInput,
      end_date: "2026-08-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects upfront greater than amount", () => {
    const parsed = createPaymentPhaseSchema.safeParse({
      ...validInput,
      upfront_amount: 1200,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects duration below 1", () => {
    const parsed = createPaymentPhaseSchema.safeParse({
      ...validInput,
      duration_months: 0,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("parseCreatePaymentPhaseFormData", () => {
  it("parses FormData into typed input", () => {
    const formData = new FormData();
    formData.set("name", "Fall tuition");
    formData.set("class_id", validInput.class_id);
    formData.set("amount", "1000");
    formData.set("upfront_amount", "200");
    formData.set("duration_months", "4");
    formData.set("start_date", "2026-09-01");
    formData.set("end_date", "2026-12-31");

    const parsed = parseCreatePaymentPhaseFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(1000);
      expect(parsed.data.duration_months).toBe(4);
    }
  });
});
