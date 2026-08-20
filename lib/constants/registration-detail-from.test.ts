import { describe, expect, it } from "vitest";
import {
  parseRegistrationDetailFrom,
  type RegistrationDetailFrom,
} from "@/lib/constants/registration-detail-from";
import { getManagerRegistrationDetailRoute } from "@/lib/constants/routes";

describe("parseRegistrationDetailFrom", () => {
  it.each([
    ["guest", "guest"],
    ["student", "student"],
    ["registrations", "registrations"],
    [undefined, "registrations"],
    [null, "registrations"],
    ["", "registrations"],
    ["other", "registrations"],
    [["student", "guest"], "student"],
  ] satisfies Array<
    [string | string[] | undefined | null, RegistrationDetailFrom]
  >)("parses %j as %s", (value, expected) => {
    expect(parseRegistrationDetailFrom(value)).toBe(expected);
  });
});

describe("getManagerRegistrationDetailRoute", () => {
  it("omits the from query for the registrations list", () => {
    expect(
      getManagerRegistrationDetailRoute("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    ).toBe("/manager/registrations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("adds from=guest when opened from guest details", () => {
    expect(
      getManagerRegistrationDetailRoute(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "guest"
      )
    ).toBe(
      "/manager/registrations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?from=guest"
    );
  });

  it("adds from=student when opened from student details", () => {
    expect(
      getManagerRegistrationDetailRoute(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "student"
      )
    ).toBe(
      "/manager/registrations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?from=student"
    );
  });
});
