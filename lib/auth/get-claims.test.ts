import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClaimsWithSharedJwks } from "@/lib/auth/get-claims";
import { getCachedJwks } from "@/lib/auth/jwks-cache";

vi.mock("@/lib/auth/jwks-cache", () => ({
  getCachedJwks: vi.fn(),
}));

describe("getClaimsWithSharedJwks", () => {
  beforeEach(() => {
    vi.mocked(getCachedJwks).mockReset();
  });

  it("passes cached JWKS into getClaims", async () => {
    const jwks = { keys: [{ kid: "key-1" }] };
    vi.mocked(getCachedJwks).mockResolvedValue(jwks as never);
    const getClaims = vi.fn(async () => ({ data: { claims: { sub: "u1" } }, error: null }));
    const client = { auth: { getClaims } } as never;

    await getClaimsWithSharedJwks(client);

    expect(getClaims).toHaveBeenCalledWith(undefined, { jwks });
  });

  it("falls back to bare getClaims when JWKS is missing", async () => {
    vi.mocked(getCachedJwks).mockResolvedValue(null);
    const getClaims = vi.fn(async () => ({ data: null, error: null }));
    const client = { auth: { getClaims } } as never;

    await getClaimsWithSharedJwks(client);

    expect(getClaims).toHaveBeenCalledWith();
  });
});
