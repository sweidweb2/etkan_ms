import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCachedJwks,
  getCachedJwks,
  JWKS_CACHE_TTL_MS,
  warmJwks,
} from "@/lib/auth/jwks-cache";

const jwksBody = {
  keys: [{ kid: "key-1", kty: "RSA", alg: "RS256" }],
};

describe("jwks-cache", () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    clearCachedJwks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
    if (originalAnon === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    }
    clearCachedJwks();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fetches JWKS once and reuses the cache", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(jwksBody), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const first = await getCachedJwks();
    const second = await getCachedJwks();

    expect(first).toEqual(jwksBody);
    expect(second).toEqual(jwksBody);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("singleflights concurrent misses", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const first = getCachedJwks();
    const second = getCachedJwks();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.(new Response(JSON.stringify(jwksBody), { status: 200 }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      jwksBody,
      jwksBody,
    ]);
  });

  it("refetches after TTL", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(jwksBody), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await getCachedJwks();
    vi.advanceTimersByTime(JWKS_CACHE_TTL_MS + 1);
    await getCachedJwks();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("warmJwks does not throw when fetch fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;

    await expect(warmJwks()).resolves.toBeUndefined();
  });
});
