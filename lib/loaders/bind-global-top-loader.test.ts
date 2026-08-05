import { describe, expect, it } from "vitest";
import { shouldTrackFetch } from "@/lib/loaders/bind-global-top-loader";

describe("shouldTrackFetch", () => {
  it("tracks RSC navigations and refreshes", () => {
    expect(
      shouldTrackFetch("/manager/workshops", {
        headers: { RSC: "1" },
      })
    ).toBe(true);
    expect(
      shouldTrackFetch("/manager/workshops", {
        headers: { RSC: "1", "Next-Router-Refresh": "1" },
      })
    ).toBe(true);
  });

  it("tracks server actions", () => {
    expect(
      shouldTrackFetch("/manager/workshops", {
        method: "POST",
        headers: { "Next-Action": "abc" },
      })
    ).toBe(true);
  });

  it("skips prefetch RSC", () => {
    expect(
      shouldTrackFetch("/manager/workshops", {
        headers: { RSC: "1", "Next-Router-Prefetch": "1" },
      })
    ).toBe(false);
  });

  it("skips unrelated fetches", () => {
    expect(shouldTrackFetch("/api/auth/navbar-state")).toBe(false);
  });
});
