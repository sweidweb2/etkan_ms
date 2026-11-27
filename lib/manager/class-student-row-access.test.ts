import { describe, expect, it } from "vitest";
import {
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
