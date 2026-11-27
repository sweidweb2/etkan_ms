import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCachedAuthEmails,
  collectCachedAuthEmails,
  getMissingAuthEmailIds,
  setCachedAuthEmails,
} from "@/lib/auth/auth-emails-cache";

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  clearCachedAuthEmails();
  vi.useRealTimers();
});

describe("auth-emails-cache", () => {
  it("only caches ids present in the email map (failed lookups stay missing)", () => {
    const resolved = new Map([["user-a", "a@school.com"]]);

    setCachedAuthEmails(["user-a", "user-b"], resolved);

    expect(collectCachedAuthEmails(["user-a", "user-b"])).toEqual(
      new Map([["user-a", "a@school.com"]])
    );
    expect(getMissingAuthEmailIds(["user-a", "user-b"])).toEqual(["user-b"]);
  });

  it("caches an intentionally empty email string", () => {
    setCachedAuthEmails(["user-empty"], new Map([["user-empty", ""]]));

    expect(getMissingAuthEmailIds(["user-empty"])).toEqual([]);
    expect(collectCachedAuthEmails(["user-empty"]).get("user-empty")).toBe("");
  });

  it("does not write when the email map is empty (failed batch)", () => {
    setCachedAuthEmails(["user-a"], new Map());

    expect(getMissingAuthEmailIds(["user-a"])).toEqual(["user-a"]);
  });

  it("treats expired entries as missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    setCachedAuthEmails(["user-a"], new Map([["user-a", "a@school.com"]]), 1_000);
    expect(getMissingAuthEmailIds(["user-a"])).toEqual([]);

    vi.advanceTimersByTime(1_001);
    expect(getMissingAuthEmailIds(["user-a"])).toEqual(["user-a"]);
    expect(collectCachedAuthEmails(["user-a"]).size).toBe(0);
  });
});
