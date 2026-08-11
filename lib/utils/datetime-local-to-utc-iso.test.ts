import { describe, expect, it } from "vitest";
import { datetimeLocalToUtcIso } from "@/lib/utils/datetime-local-to-utc-iso";

describe("datetimeLocalToUtcIso", () => {
  it("returns null for empty values", () => {
    expect(datetimeLocalToUtcIso(null)).toBeNull();
    expect(datetimeLocalToUtcIso("")).toBeNull();
    expect(datetimeLocalToUtcIso("   ")).toBeNull();
  });

  it("interprets naive datetime-local as Asia/Beirut (summer EEST +03)", () => {
    expect(datetimeLocalToUtcIso("2026-07-10T10:00")).toBe(
      "2026-07-10T07:00:00Z"
    );
  });

  it("interprets naive datetime-local as Asia/Beirut (winter EET +02)", () => {
    expect(datetimeLocalToUtcIso("2026-01-15T10:00")).toBe(
      "2026-01-15T08:00:00Z"
    );
  });

  it("passes through absolute ISO instants", () => {
    expect(datetimeLocalToUtcIso("2026-07-10T07:00:00Z")).toBe(
      "2026-07-10T07:00:00Z"
    );
  });

  it("returns null for invalid input", () => {
    expect(datetimeLocalToUtcIso("not-a-date")).toBeNull();
  });
});
