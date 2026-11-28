import { describe, expect, it } from "vitest";
import {
  loginUrlForSessionEnded,
  parseSessionCrossTabMessage,
  parseSessionEndedStorageValue,
} from "@/lib/auth/session-cross-tab";

describe("parseSessionCrossTabMessage", () => {
  it("accepts session_ended and activity payloads", () => {
    expect(
      parseSessionCrossTabMessage({ type: "session_ended", reason: "signed_out" })
    ).toEqual({ type: "session_ended", reason: "signed_out" });
    expect(
      parseSessionCrossTabMessage({
        type: "session_ended",
        reason: "session_expired",
      })
    ).toEqual({ type: "session_ended", reason: "session_expired" });
    expect(parseSessionCrossTabMessage({ type: "activity" })).toEqual({
      type: "activity",
    });
  });

  it("rejects invalid payloads", () => {
    expect(parseSessionCrossTabMessage(null)).toBeNull();
    expect(parseSessionCrossTabMessage({ type: "session_ended" })).toBeNull();
    expect(
      parseSessionCrossTabMessage({ type: "session_ended", reason: "nope" })
    ).toBeNull();
    expect(parseSessionCrossTabMessage({ type: "other" })).toBeNull();
  });
});

describe("parseSessionEndedStorageValue", () => {
  it("reads reason from storage JSON", () => {
    expect(
      parseSessionEndedStorageValue(
        JSON.stringify({ reason: "signed_out", at: 1 })
      )
    ).toBe("signed_out");
    expect(parseSessionEndedStorageValue("not-json")).toBeNull();
    expect(parseSessionEndedStorageValue(null)).toBeNull();
  });
});

describe("loginUrlForSessionEnded", () => {
  it("maps reasons to login toast query params", () => {
    expect(loginUrlForSessionEnded("signed_out")).toBe(
      "/auth/login?toast=signed_out"
    );
    expect(loginUrlForSessionEnded("session_expired")).toBe(
      "/auth/login?message=session_expired"
    );
  });
});
