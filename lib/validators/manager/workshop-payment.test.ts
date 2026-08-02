import { describe, expect, it } from "vitest";
import {
  WORKSHOP_PAYMENT_METHODS,
  WORKSHOP_PAYMENT_TYPES,
} from "@/lib/constants/manager-workshop-display";
import {
  createWorkshopPaymentSchema,
  parseCreateWorkshopPaymentFormData,
  updateWorkshopPaymentSchema,
} from "@/lib/validators/manager/workshop-payment";

const workshopId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";

const validCreate = {
  workshop_id: workshopId,
  amount: 150,
  type: WORKSHOP_PAYMENT_TYPES.CREDIT,
  payment_date: "2026-08-01",
  payment_method: WORKSHOP_PAYMENT_METHODS.CASH,
  notes: "Deposit",
};

describe("createWorkshopPaymentSchema", () => {
  it("accepts a valid credit payment", () => {
    expect(createWorkshopPaymentSchema.safeParse(validCreate).success).toBe(
      true
    );
  });

  it("rejects zero or negative amounts", () => {
    expect(
      createWorkshopPaymentSchema.safeParse({ ...validCreate, amount: 0 })
        .success
    ).toBe(false);
    expect(
      createWorkshopPaymentSchema.safeParse({ ...validCreate, amount: -1 })
        .success
    ).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(
      createWorkshopPaymentSchema.safeParse({
        ...validCreate,
        type: "refund",
      }).success
    ).toBe(false);
  });

  it("coerces empty payment method and notes to null", () => {
    const parsed = createWorkshopPaymentSchema.safeParse({
      ...validCreate,
      payment_method: "",
      notes: "   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.payment_method).toBeNull();
      expect(parsed.data.notes).toBeNull();
    }
  });
});

describe("updateWorkshopPaymentSchema", () => {
  it("requires payment id", () => {
    expect(
      updateWorkshopPaymentSchema.safeParse({
        ...validCreate,
        id: paymentId,
      }).success
    ).toBe(true);
    expect(updateWorkshopPaymentSchema.safeParse(validCreate).success).toBe(
      false
    );
  });
});

describe("parseCreateWorkshopPaymentFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("workshop_id", workshopId);
    formData.set("amount", "75.5");
    formData.set("type", WORKSHOP_PAYMENT_TYPES.DEBIT);
    formData.set("payment_date", "2026-08-02");
    formData.set("payment_method", "__none__");
    formData.set("notes", "");

    const parsed = parseCreateWorkshopPaymentFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(75.5);
      expect(parsed.data.type).toBe(WORKSHOP_PAYMENT_TYPES.DEBIT);
      expect(parsed.data.payment_method).toBeNull();
    }
  });
});
