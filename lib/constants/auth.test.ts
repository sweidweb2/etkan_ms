import { describe, expect, it } from "vitest";
import { isGuestOnlyAuthRoute } from "@/lib/constants/auth";
import { hidesPublicSiteChrome, ROUTES } from "@/lib/constants/routes";

describe("isGuestOnlyAuthRoute", () => {
  it("treats login as guest-only", () => {
    expect(isGuestOnlyAuthRoute(ROUTES.LOGIN)).toBe(true);
  });

  it("keeps public walk-in registration open without auth gating", () => {
    expect(isGuestOnlyAuthRoute(ROUTES.REGISTER)).toBe(false);
  });

  it("does not block guest invite registration links", () => {
    expect(isGuestOnlyAuthRoute("/register/guest/abc")).toBe(false);
  });
});

describe("hidesPublicSiteChrome", () => {
  it("hides navbar on financial and guest invite forms", () => {
    expect(hidesPublicSiteChrome("/f/token")).toBe(true);
    expect(hidesPublicSiteChrome("/register/guest/token")).toBe(true);
    expect(hidesPublicSiteChrome(ROUTES.REGISTER)).toBe(false);
    expect(hidesPublicSiteChrome(ROUTES.HOME)).toBe(false);
  });
});
