import { afterEach, describe, expect, it } from "vitest";
import { isCronRequestAuthorized } from "@/lib/ops/cron-auth";

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = ORIGINAL;
  }
});

function requestWithBearer(token: string | null): Request {
  const headers = new Headers();
  if (token !== null) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request("https://example.test/api/cron/x", {
    method: "POST",
    headers,
  });
}

describe("isCronRequestAuthorized", () => {
  it("fails closed when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequestAuthorized(requestWithBearer("anything"))).toBe(false);
  });

  it("fails closed when CRON_SECRET is blank", () => {
    process.env.CRON_SECRET = "   ";
    expect(isCronRequestAuthorized(requestWithBearer("   "))).toBe(false);
  });

  it("rejects missing Authorization header", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isCronRequestAuthorized(requestWithBearer(null))).toBe(false);
  });

  it("rejects wrong bearer token", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isCronRequestAuthorized(requestWithBearer("nope"))).toBe(false);
  });

  it("accepts the exact secret", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isCronRequestAuthorized(requestWithBearer("s3cret"))).toBe(true);
  });

  it("trims the configured secret but not the bearer token", () => {
    process.env.CRON_SECRET = "  s3cret  ";
    expect(isCronRequestAuthorized(requestWithBearer("s3cret"))).toBe(true);
    expect(isCronRequestAuthorized(requestWithBearer("  s3cret  "))).toBe(
      false
    );
  });
});
