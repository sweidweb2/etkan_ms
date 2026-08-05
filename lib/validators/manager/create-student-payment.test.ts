import { describe, expect, it } from "vitest";
import {
  createStudentPaymentFormSchema,
  createStudentPaymentSchema,
  parseCreateStudentPaymentFormData,
} from "@/lib/validators/manager/create-student-payment";

const validInput = {
  student_payment_phase_id: "11111111-1111-4111-8111-111111111111",
  payment_date: "2026-07-15",
  amount: 500,
  payment_method: "cash",
  received_by: "Manager",
  received_by_management: true,
  notes: "",
};

describe("createStudentPaymentSchema", () => {
  it("accepts a valid payload", () => {
    expect(createStudentPaymentSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects invalid payment method", () => {
    expect(
      createStudentPaymentSchema.safeParse({
        ...validInput,
        payment_method: "crypto",
      }).success
    ).toBe(false);
  });

  it("rejects missing date", () => {
    expect(
      createStudentPaymentSchema.safeParse({
        ...validInput,
        payment_date: "",
      }).success
    ).toBe(false);
  });

  it("rejects zero amount", () => {
    expect(
      createStudentPaymentSchema.safeParse({
        ...validInput,
        amount: 0,
      }).success
    ).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(
      createStudentPaymentSchema.safeParse({
        ...validInput,
        amount: -1,
      }).success
    ).toBe(false);
  });
});

describe("createStudentPaymentFormSchema", () => {
  it("rejects amount above phase price", () => {
    const schema = createStudentPaymentFormSchema(100);
    expect(
      schema.safeParse({
        ...validInput,
        amount: 100.01,
      }).success
    ).toBe(false);
  });

  it("accepts amount equal to phase price", () => {
    const schema = createStudentPaymentFormSchema(500);
    expect(schema.safeParse(validInput).success).toBe(true);
  });
});

describe("parseCreateStudentPaymentFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("student_payment_phase_id", validInput.student_payment_phase_id);
    formData.set("payment_date", validInput.payment_date);
    formData.set("amount", "500");
    formData.set("payment_method", "cash");
    formData.set("received_by", "Manager");
    formData.set("received_by_management", "true");

    const parsed = parseCreateStudentPaymentFormData(formData);
    expect(parsed.success).toBe(true);
  });
});
