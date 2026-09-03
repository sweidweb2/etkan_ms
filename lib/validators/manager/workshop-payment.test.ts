import { describe, expect, it } from "vitest";
import {
  WORKSHOP_PAYMENT_METHODS,
  WORKSHOP_PAYMENT_TYPES,
} from "@/lib/constants/manager-workshop-display";
import {
  createWorkshopPaymentFormSchema,
  createWorkshopPaymentSchema,
  getWorkshopPaymentRemainingCap,
  isWorkshopFullyPaid,
  parseCreateWorkshopPaymentFormData,
  updateWorkshopPaymentSchema,
  WORKSHOP_PAYMENT_REMAINING_AMOUNT_MESSAGE,
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

describe("getWorkshopPaymentRemainingCap", () => {
  it("returns null when price is missing", () => {
    expect(getWorkshopPaymentRemainingCap(null, 50)).toBeNull();
    expect(getWorkshopPaymentRemainingCap(undefined, 50)).toBeNull();
  });

  it("returns price minus paid, clamped at zero", () => {
    expect(getWorkshopPaymentRemainingCap(150, 40)).toBe(110);
    expect(getWorkshopPaymentRemainingCap(150, 150)).toBe(0);
    expect(getWorkshopPaymentRemainingCap(150, 200)).toBe(0);
  });
});

describe("isWorkshopFullyPaid", () => {
  it("is false when there is no price", () => {
    expect(isWorkshopFullyPaid(null, 100)).toBe(false);
    expect(isWorkshopFullyPaid(0, 0)).toBe(false);
  });

  it("is true when paid net covers the price", () => {
    expect(isWorkshopFullyPaid(150, 150)).toBe(true);
    expect(isWorkshopFullyPaid(150, 200)).toBe(true);
    expect(isWorkshopFullyPaid(150, 149.99)).toBe(false);
  });
});

describe("createWorkshopPaymentFormSchema", () => {
  it("rejects credit amounts above the remaining cap", () => {
    const parsed = createWorkshopPaymentFormSchema(100).safeParse({
      ...validCreate,
      amount: 100.01,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        WORKSHOP_PAYMENT_REMAINING_AMOUNT_MESSAGE
      );
    }
  });

  it("allows credit amounts at or below the remaining cap", () => {
    expect(
      createWorkshopPaymentFormSchema(100).safeParse({
        ...validCreate,
        amount: 100,
      }).success
    ).toBe(true);
  });

  it("does not cap debit amounts by remaining", () => {
    expect(
      createWorkshopPaymentFormSchema(50).safeParse({
        ...validCreate,
        type: WORKSHOP_PAYMENT_TYPES.DEBIT,
        amount: 200,
      }).success
    ).toBe(true);
  });

  it("skips remaining cap when maxAmount is null", () => {
    expect(
      createWorkshopPaymentFormSchema(null).safeParse({
        ...validCreate,
        amount: 9999,
      }).success
    ).toBe(true);
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
