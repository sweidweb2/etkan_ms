import { describe, expect, it } from "vitest";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import {
  changeStudentStatusSchema,
  parseChangeStudentStatusFormData,
} from "@/lib/validators/manager/change-student-status";

const userId = "11111111-1111-4111-8111-111111111111";

describe("changeStudentStatusSchema", () => {
  it("accepts activate without side-effect flags", () => {
    const parsed = changeStudentStatusSchema.safeParse({
      user_id: userId,
      target_status: STUDENT_STATUSES.ACTIVE,
      remove_from_classes: false,
      remove_open_spps: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects activate with remove_from_classes", () => {
    const parsed = changeStudentStatusSchema.safeParse({
      user_id: userId,
      target_status: STUDENT_STATUSES.ACTIVE,
      remove_from_classes: true,
      remove_open_spps: false,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects activate with remove_open_spps", () => {
    const parsed = changeStudentStatusSchema.safeParse({
      user_id: userId,
      target_status: STUDENT_STATUSES.ACTIVE,
      remove_from_classes: false,
      remove_open_spps: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts inactivate with both toggles", () => {
    const parsed = changeStudentStatusSchema.safeParse({
      user_id: userId,
      target_status: STUDENT_STATUSES.INACTIVE,
      remove_from_classes: true,
      remove_open_spps: true,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("parseChangeStudentStatusFormData", () => {
  it("parses FormData booleans", () => {
    const formData = new FormData();
    formData.set("user_id", userId);
    formData.set("target_status", "inactive");
    formData.set("remove_from_classes", "true");
    formData.set("remove_open_spps", "false");

    const parsed = parseChangeStudentStatusFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.remove_from_classes).toBe(true);
      expect(parsed.data.remove_open_spps).toBe(false);
    }
  });

  it("defaults missing toggles to false", () => {
    const formData = new FormData();
    formData.set("user_id", userId);
    formData.set("target_status", "active");

    const parsed = parseChangeStudentStatusFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.remove_from_classes).toBe(false);
      expect(parsed.data.remove_open_spps).toBe(false);
    }
  });
});
