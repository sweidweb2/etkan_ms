import { describe, expect, it } from "vitest";
import {
  deleteStudentPaymentPhaseSchema,
  parseDeleteStudentPaymentPhaseFormData,
} from "@/lib/validators/manager/delete-student-payment-phase";

const validId = "11111111-1111-4111-8111-111111111111";

describe("deleteStudentPaymentPhaseSchema", () => {
  it("accepts a valid uuid", () => {
    expect(deleteStudentPaymentPhaseSchema.safeParse({ id: validId }).success).toBe(
      true
    );
  });

  it("rejects a missing id", () => {
    expect(deleteStudentPaymentPhaseSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    expect(
      deleteStudentPaymentPhaseSchema.safeParse({ id: "not-a-uuid" }).success
    ).toBe(false);
  });
});

describe("parseDeleteStudentPaymentPhaseFormData", () => {
  it("parses FormData", () => {
    const formData = new FormData();
    formData.set("id", validId);

    const parsed = parseDeleteStudentPaymentPhaseFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe(validId);
    }
  });

  it("rejects invalid FormData", () => {
    const formData = new FormData();
    formData.set("id", "bad");

    const parsed = parseDeleteStudentPaymentPhaseFormData(formData);
    expect(parsed.success).toBe(false);
  });
});
