import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCachedAuthEmails } from "@/lib/auth/auth-emails-cache";
import { listAuthEmailsByIds } from "@/repositories/auth.repository";

const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createClient(overrides?: {
  rpc?: ReturnType<typeof vi.fn>;
  getUserById?: ReturnType<typeof vi.fn>;
}) {
  return {
    rpc: overrides?.rpc ?? vi.fn(),
    auth: {
      admin: {
        getUserById: overrides?.getUserById ?? vi.fn(),
      },
    },
  } as never;
}

beforeEach(() => {
  clearCachedAuthEmails();
  vi.useRealTimers();
});

afterEach(() => {
  clearCachedAuthEmails();
  vi.useRealTimers();
});

describe("listAuthEmailsByIds", () => {
  it("returns an empty map for empty input without calling Auth", async () => {
    const rpc = vi.fn();
    const getUserById = vi.fn();
    const client = createClient({ rpc, getUserById });

    const result = await listAuthEmailsByIds(client, []);

    expect(result.error).toBeNull();
    expect(result.data.size).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("resolves emails via the batch RPC and skips Auth Admin", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: userA, email: "a@school.com" },
        { id: userB, email: "b@school.com" },
      ],
      error: null,
    });
    const getUserById = vi.fn();
    const client = createClient({ rpc, getUserById });

    const result = await listAuthEmailsByIds(client, [userA, userB, userA]);

    expect(result.error).toBeNull();
    expect(result.data.get(userA)).toBe("a@school.com");
    expect(result.data.get(userB)).toBe("b@school.com");
    expect(rpc).toHaveBeenCalledWith("list_auth_emails_by_ids", {
      p_ids: [userA, userB],
    });
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("falls back to Auth Admin only for RPC misses", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: userA, email: "a@school.com" }],
      error: null,
    });
    const getUserById = vi.fn().mockResolvedValue({
      data: { user: { email: "b@school.com" } },
      error: null,
    });
    const client = createClient({ rpc, getUserById });

    const result = await listAuthEmailsByIds(client, [userA, userB]);

    expect(result.data.get(userA)).toBe("a@school.com");
    expect(result.data.get(userB)).toBe("b@school.com");
    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(getUserById).toHaveBeenCalledWith(userB);
  });

  it("soft-fails Auth Admin errors and negative-caches the miss", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const getUserById = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Auth unavailable" },
    });
    const client = createClient({ rpc, getUserById });

    const first = await listAuthEmailsByIds(client, [userA]);
    expect(first.data.get(userA)).toBe("");
    expect(getUserById).toHaveBeenCalledTimes(1);

    const second = await listAuthEmailsByIds(client, [userA]);
    expect(second.data.get(userA)).toBe("");
    expect(getUserById).toHaveBeenCalledTimes(1);
  });

  it("soft-fails RPC errors without Auth Admin fan-out", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rpc down" },
    });
    const getUserById = vi.fn();
    const client = createClient({ rpc, getUserById });

    const result = await listAuthEmailsByIds(client, [userA, userB]);
    expect(result.data.get(userA)).toBe("");
    expect(result.data.get(userB)).toBe("");
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("soft-fails when Auth Admin hangs past the timeout", async () => {
    vi.useFakeTimers();
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const getUserById = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );
    const client = createClient({ rpc, getUserById });

    const pending = listAuthEmailsByIds(client, [userA]);
    await vi.advanceTimersByTimeAsync(8_000);
    const result = await pending;

    expect(result.error).toBeNull();
    expect(result.data.get(userA)).toBe("");
  });

  it("reuses the per-id cache on a subsequent call", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: userA, email: "a@school.com" }],
      error: null,
    });
    const getUserById = vi.fn();
    const client = createClient({ rpc, getUserById });

    await listAuthEmailsByIds(client, [userA]);
    await listAuthEmailsByIds(client, [userA]);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(getUserById).not.toHaveBeenCalled();
  });
});
