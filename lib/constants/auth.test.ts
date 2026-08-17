import { describe, expect, it } from "vitest";
import { isGuestOnlyAuthRoute } from "@/lib/constants/auth";
import { hidesPublicSiteChrome, ROUTES } from "@/lib/constants/routes";

describe("isGuestOnlyAuthRoute", () => {
  it("treats public walk-in registration as guest-only", () => {
    expect(isGuestOnlyAuthRoute(ROUTES.LOGIN)).toBe(true);
    expect(isGuestOnlyAuthRoute(ROUTES.REGISTER)).toBe(true);
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
