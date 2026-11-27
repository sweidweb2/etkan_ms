import { afterEach, describe, expect, it } from "vitest";
import {
  clearCachedAuthEmails,
  collectCachedAuthEmails,
  getMissingAuthEmailIds,
  setCachedAuthEmails,
} from "@/lib/auth/auth-emails-cache";

afterEach(() => {
  clearCachedAuthEmails();
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
});
