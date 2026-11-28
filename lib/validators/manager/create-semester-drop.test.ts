import { describe, expect, it } from "vitest";
import { SEMESTER_DROP_RESTRICTION_MODES } from "@/lib/manager/accounting/constants";
import { createSemesterDropSchema } from "@/lib/validators/manager/create-semester-drop";

const studentId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";

describe("createSemesterDropSchema", () => {
  it("maps empty percent to none", () => {
    const parsed = createSemesterDropSchema.safeParse({
      student_id: studentId,
      class_id: classId,
      restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.PERCENT,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.restriction_mode).toBe(
        SEMESTER_DROP_RESTRICTION_MODES.NONE
      );
      expect(parsed.data.required_percent).toBeNull();
      expect(parsed.data.required_amount).toBeNull();
    }
  });

  it("maps amount 0 to none", () => {
    const parsed = createSemesterDropSchema.safeParse({
      student_id: studentId,
      class_id: classId,
      restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.AMOUNT,
      required_amount: 0,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.restriction_mode).toBe(
        SEMESTER_DROP_RESTRICTION_MODES.NONE
      );
    }
  });

  it("keeps percent mode with value", () => {
    const parsed = createSemesterDropSchema.safeParse({
      student_id: studentId,
      class_id: classId,
      restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.PERCENT,
      required_percent: 50,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.restriction_mode).toBe(
        SEMESTER_DROP_RESTRICTION_MODES.PERCENT
      );
      expect(parsed.data.required_percent).toBe(50);
      expect(parsed.data.required_amount).toBeNull();
    }
  });

  it("keeps amount mode with value", () => {
    const parsed = createSemesterDropSchema.safeParse({
      student_id: studentId,
      class_id: classId,
      restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.AMOUNT,
      required_amount: 75.5,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.restriction_mode).toBe(
        SEMESTER_DROP_RESTRICTION_MODES.AMOUNT
      );
      expect(parsed.data.required_amount).toBe(75.5);
      expect(parsed.data.required_percent).toBeNull();
    }
  });

  it("rejects amount above known final_amount_due", () => {
    const parsed = createSemesterDropSchema.safeParse({
      student_id: studentId,
      class_id: classId,
      restriction_mode: SEMESTER_DROP_RESTRICTION_MODES.AMOUNT,
      required_amount: 120,
      final_amount_due: 100,
    });
    expect(parsed.success).toBe(false);
  });
});
