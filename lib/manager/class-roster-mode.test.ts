import { describe, expect, it } from "vitest";
import { resolveClassRosterOptions } from "@/lib/manager/class-roster-mode";

describe("resolveClassRosterOptions", () => {
  it("maps named modes to roster load flags", () => {
    expect(resolveClassRosterOptions({ mode: "teacher" })).toEqual({
      includeAuthEmails: false,
      includeRemoveEligibility: false,
    });
    expect(resolveClassRosterOptions({ mode: "grades" })).toEqual({
      includeAuthEmails: true,
      includeRemoveEligibility: false,
    });
    expect(
      resolveClassRosterOptions({
        mode: "managerDetail",
        semesterId: "sem-1",
      })
    ).toEqual({
      includeAuthEmails: true,
      includeRemoveEligibility: true,
      semesterId: "sem-1",
    });
  });
});
