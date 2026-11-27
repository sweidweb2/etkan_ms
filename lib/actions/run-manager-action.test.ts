import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionAuditActor = vi.fn();
const createSupabaseAdminClient = vi.fn(() => ({ __admin: true }));

vi.mock("@/lib/auth/session", () => ({
  getSessionAuditActor: (...args: unknown[]) => getSessionAuditActor(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: (...args: unknown[]) =>
    createSupabaseAdminClient(...args),
}));

vi.mock("next/server", () => ({
  after: (fn: () => void) => {
    fn();
  },
}));

describe("runManagerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionAuditActor.mockResolvedValue({
      userId: "user-1",
      role: "manager",
    });
  });

  it("returns a typed failure when mutate throws", async () => {
    const { runManagerAction } = await import("@/lib/actions/run-manager-action");

    const result = await runManagerAction({
      formData: new FormData(),
      parse: () => ({ success: true, data: { ok: true } }),
      mutate: async () => {
        throw new Error("db down");
      },
      mapSuccess: () => ({ success: true as const, message: "ok" }),
    });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("runManagerMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionAuditActor.mockResolvedValue({
      userId: "user-1",
      role: "manager",
    });
  });

  it("returns a typed failure when mutate throws", async () => {
    const { runManagerMutation } = await import(
      "@/lib/actions/run-manager-action"
    );

    const result = await runManagerMutation({
      data: { id: "1" },
      mutate: async () => {
        throw new Error("db down");
      },
      mapSuccess: () => ({ success: true as const, message: "ok" }),
    });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
