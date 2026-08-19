import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/debug/nav-timing", () => ({
  isNavTimingEnabled: vi.fn(() => true),
}));

import { isNavTimingEnabled } from "@/lib/debug/nav-timing";
import { withClaimsTiming } from "@/lib/debug/claims-timing";

describe("withClaimsTiming", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.mocked(isNavTimingEnabled).mockReturnValue(true);
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("does not wrap fetch when nav debug is off", async () => {
    vi.mocked(isNavTimingEnabled).mockReturnValue(false);
    const result = await withClaimsTiming("t1", async () => "ok");
    expect(result).toBe("ok");
    expect(console.info).not.toHaveBeenCalled();
  });

  it("logs jwks HIT when getClaims makes no Auth HTTP", async () => {
    await withClaimsTiming("t1", async () => null);
    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[NAV t1\] claims_detail session=\d+ms refresh=0ms jwks=HIT verify=\d+ms getUser=0ms in_flight=0/
      )
    );
  });

  it("logs jwks MISS when jwks.json is fetched", async () => {
    globalThis.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;

    await withClaimsTiming("t1", async () => {
      await fetch("https://example.supabase.co/auth/v1/.well-known/jwks.json");
      return null;
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[NAV t1\] claims_detail session=\d+ms refresh=0ms jwks=MISS:\d+ms verify=\d+ms getUser=0ms in_flight=0/
      )
    );
  });

  it("logs refresh when the token endpoint is posted", async () => {
    globalThis.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;

    await withClaimsTiming("t1", async () => {
      await fetch("https://example.supabase.co/auth/v1/token", { method: "POST" });
      return null;
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(/refresh=\d+ms/)
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(/jwks=HIT/)
    );
  });

  it("reports in_flight from overlapping getClaims", async () => {
    let sawInnerInFlight = "";
    vi.spyOn(console, "info").mockImplementation((message: string) => {
      if (typeof message === "string" && message.includes("t-inner")) {
        sawInnerInFlight = message;
      }
    });

    await withClaimsTiming("t-outer", async () => {
      await withClaimsTiming("t-inner", async () => null);
      return null;
    });

    expect(sawInnerInFlight).toMatch(/in_flight=1/);
  });
});
