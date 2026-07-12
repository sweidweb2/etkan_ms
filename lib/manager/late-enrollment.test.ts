import { describe, expect, it } from "vitest";
import { isDueDatePast } from "@/lib/manager/late-enrollment";

describe("isDueDatePast", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");

  it("returns false for null", () => {
    expect(isDueDatePast(null, now)).toBe(false);
  });

  it("returns false for invalid date", () => {
    expect(isDueDatePast("not-a-date", now)).toBe(false);
  });

  it("returns true when due is before now", () => {
    expect(isDueDatePast("2026-07-01T00:00:00.000Z", now)).toBe(true);
  });

  it("returns false when due is after now", () => {
    expect(isDueDatePast("2026-07-20T00:00:00.000Z", now)).toBe(false);
  });
});
