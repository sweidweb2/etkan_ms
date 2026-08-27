import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TURNSTILE_REGISTER_ACTION,
  TURNSTILE_TOKEN_MAX_LENGTH,
  TURNSTILE_VERIFY_FAILED_MESSAGE,
} from "@/lib/constants/turnstile";

vi.mock("server-only", () => ({}));

const originalEnv = {
  secret: process.env.TURNSTILE_SECRET,
  hostnames: process.env.TURNSTILE_HOSTNAMES,
  siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
};

function restoreEnv() {
  if (originalEnv.secret === undefined) {
    delete process.env.TURNSTILE_SECRET;
  } else {
    process.env.TURNSTILE_SECRET = originalEnv.secret;
  }
  if (originalEnv.hostnames === undefined) {
    delete process.env.TURNSTILE_HOSTNAMES;
  } else {
    process.env.TURNSTILE_HOSTNAMES = originalEnv.hostnames;
  }
  if (originalEnv.siteKey === undefined) {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  } else {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalEnv.siteKey;
  }
}

function setRequiredEnv() {
  process.env.TURNSTILE_SECRET = "test-secret";
  process.env.TURNSTILE_HOSTNAMES = "localhost,127.0.0.1";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
}

async function loadVerify() {
  const turnstileModule = await import("@/lib/cloudflare/turnstile");
  return turnstileModule.verifyTurnstileToken;
}

describe("verifyTurnstileToken", () => {
  beforeEach(() => {
    vi.resetModules();
    setRequiredEnv();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    restoreEnv();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts a successful siteverify response for the expected action and hostname", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: TURNSTILE_REGISTER_ACTION,
          hostname: "localhost",
        }),
        { status: 200 }
      )
    );

    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
      remoteip: "203.0.113.10",
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const body = String(init?.body);
    expect(body).toContain("secret=test-secret");
    expect(body).toContain("response=fresh-token");
    expect(body).toContain("remoteip=203.0.113.10");
  });

  it("omits remoteip when it is unknown", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: TURNSTILE_REGISTER_ACTION,
          hostname: "localhost",
        }),
        { status: 200 }
      )
    );

    const verifyTurnstileToken = await loadVerify();
    await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
      remoteip: "unknown",
    });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(String(init?.body)).not.toContain("remoteip");
  });

  it("rejects a missing token without calling siteverify", async () => {
    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a token that is too long", async () => {
    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "x".repeat(TURNSTILE_TOKEN_MAX_LENGTH + 1),
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the secret is missing", async () => {
    delete process.env.TURNSTILE_SECRET;
    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the hostname allowlist is empty", async () => {
    process.env.TURNSTILE_HOSTNAMES = "  ,  ";
    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the site key is missing", async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects success: false from siteverify", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
        { status: 200 }
      )
    );

    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
  });

  it("rejects a mismatched action", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "login",
          hostname: "localhost",
        }),
        { status: 200 }
      )
    );

    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
  });

  it("rejects a hostname that is not allowlisted", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: TURNSTILE_REGISTER_ACTION,
          hostname: "evil.example",
        }),
        { status: 200 }
      )
    );

    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
  });

  it("rejects a replayed token (timeout-or-duplicate)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["timeout-or-duplicate"],
        }),
        { status: 200 }
      )
    );

    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "already-used-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
  });

  it("rejects when siteverify is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"));

    const verifyTurnstileToken = await loadVerify();
    const result = await verifyTurnstileToken({
      token: "fresh-token",
      expectedAction: TURNSTILE_REGISTER_ACTION,
    });

    expect(result).toEqual({
      ok: false,
      error: TURNSTILE_VERIFY_FAILED_MESSAGE,
    });
  });
});
