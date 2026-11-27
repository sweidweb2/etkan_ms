import { describe, expect, it } from "vitest";
import {
  canRemoveClassStudent,
  classStudentRemoveBlockedReason,
  classStudentRowKey,
  hasLinkedStudentProfile,
} from "@/lib/manager/class-student-row-access";

describe("hasLinkedStudentProfile", () => {
  it("is true only for non-empty profile ids", () => {
    expect(hasLinkedStudentProfile("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(
      true
    );
    expect(hasLinkedStudentProfile("")).toBe(false);
    expect(hasLinkedStudentProfile(null)).toBe(false);
    expect(hasLinkedStudentProfile(undefined)).toBe(false);
  });
});

describe("classStudentRowKey", () => {
  it("prefers user_id so orphan empty profile ids do not collide", () => {
    expect(
      classStudentRowKey({
        user_id: "user-1",
        id: "enrollment-1",
      })
    ).toBe("user-1");
  });
});

describe("canRemoveClassStudent", () => {
  it("trusts can_remove_student from the server row", () => {
    expect(canRemoveClassStudent({ can_remove_student: true })).toBe(true);
    expect(
      canRemoveClassStudent({
        can_remove_student: false,
        has_pending_drop: true,
      })
    ).toBe(false);
    expect(
      classStudentRemoveBlockedReason({
        can_remove_student: false,
        has_semester_spp_payments: true,
      })
    ).toMatch(/Drop semester/);
  });
});
