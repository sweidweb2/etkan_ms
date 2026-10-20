import { describe, expect, it } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  getSppClearanceExpiresAtIso,
  isSppClearanceActive,
} from "@/lib/manager/accounting/spp-clearance";

describe("isSppClearanceActive", () => {
  const createdAt = "2026-03-01T12:00:00.000Z";

  it("is active before expiry", () => {
    const now = Temporal.Instant.from("2026-03-10T12:00:00.000Z");
    expect(isSppClearanceActive(createdAt, 30, now)).toBe(true);
  });

  it("is inactive exactly at expiry", () => {
    const now = Temporal.Instant.from("2026-03-31T12:00:00.000Z");
    expect(isSppClearanceActive(createdAt, 30, now)).toBe(false);
  });

  it("is inactive after expiry", () => {
    const now = Temporal.Instant.from("2026-04-01T00:00:00.000Z");
    expect(isSppClearanceActive(createdAt, 30, now)).toBe(false);
  });

  it("rejects invalid duration", () => {
    expect(isSppClearanceActive(createdAt, 0)).toBe(false);
    expect(isSppClearanceActive(createdAt, Number.NaN)).toBe(false);
  });
});

describe("getSppClearanceExpiresAtIso", () => {
  it("adds whole days from created_at", () => {
    expect(getSppClearanceExpiresAtIso("2026-03-01T12:00:00.000Z", 7)).toBe(
      "2026-03-08T12:00:00Z"
    );
  });
});
