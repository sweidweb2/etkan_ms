import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { UNAUTHORIZED_MESSAGE } from "@/services/auth/authorization.service";

const getSessionAuditActor = vi.fn();
const createSupabaseAdminClient = vi.fn(() => ({ __admin: true }));
const assertPermission = vi.fn();
const assertPermissions = vi.fn();
const hasAnyPermission = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionAuditActor: (...args: unknown[]) => getSessionAuditActor(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: (...args: unknown[]) =>
    createSupabaseAdminClient(...args),
}));

vi.mock("@/services/auth/authorization.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/auth/authorization.service")
  >("@/services/auth/authorization.service");
  return {
    ...actual,
    assertPermission: (...args: unknown[]) => assertPermission(...args),
    assertPermissions: (...args: unknown[]) => assertPermissions(...args),
    hasAnyPermission: (...args: unknown[]) => hasAnyPermission(...args),
  };
});

vi.mock("next/server", () => ({
  after: (fn: () => void) => {
    fn();
  },
}));

vi.mock("@/lib/ops/logger", () => ({
  logOpsError: vi.fn(),
}));

describe("runManagerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionAuditActor.mockResolvedValue({
      userId: "user-1",
      role: "manager",
    });
    assertPermission.mockResolvedValue(undefined);
    assertPermissions.mockResolvedValue(undefined);
    hasAnyPermission.mockResolvedValue(true);
  });

  it("asserts permission before mutate", async () => {
    const { runManagerAction } = await import("@/lib/actions/run-manager-action");
    const mutate = vi.fn(async () => ({ success: true as const }));

    await runManagerAction({
      formData: new FormData(),
      permission: PERMISSIONS.CLASSES_ADD_STUDENT,
      parse: () => ({ success: true, data: { ok: true } }),
      mutate,
      mapSuccess: () => ({ success: true as const, message: "ok" }),
    });

    expect(assertPermission).toHaveBeenCalledWith(
      { __admin: true },
      "user-1",
      PERMISSIONS.CLASSES_ADD_STUDENT
    );
    expect(mutate).toHaveBeenCalled();
  });

  it("returns unauthorized when permission assert throws", async () => {
    const { runManagerAction } = await import("@/lib/actions/run-manager-action");
    assertPermission.mockRejectedValue(new Error(UNAUTHORIZED_MESSAGE));

    const result = await runManagerAction({
      formData: new FormData(),
      permission: PERMISSIONS.CLASSES_ADD_STUDENT,
      parse: () => ({ success: true, data: { ok: true } }),
      mutate: async () => ({ success: true as const }),
      mapSuccess: () => ({ success: true as const, message: "ok" }),
    });

    expect(result).toEqual({
      success: false,
      error: UNAUTHORIZED_MESSAGE,
    });
  });

  it("returns a typed failure when mutate throws", async () => {
    const { runManagerAction } = await import("@/lib/actions/run-manager-action");

    const result = await runManagerAction({
      formData: new FormData(),
      permission: PERMISSIONS.CLASSES_VIEW,
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

  it("supports anyOf permission gates", async () => {
    const { runManagerAction } = await import("@/lib/actions/run-manager-action");

    await runManagerAction({
      formData: new FormData(),
      permission: {
        anyOf: [PERMISSIONS.TASKS_UPDATE, PERMISSIONS.TEAM_LEADER_TASKS_UPDATE],
      },
      parse: () => ({ success: true, data: { ok: true } }),
      mutate: async () => ({ success: true as const }),
      mapSuccess: () => ({ success: true as const, message: "ok" }),
    });

    expect(hasAnyPermission).toHaveBeenCalled();
  });
});

describe("runManagerMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionAuditActor.mockResolvedValue({
      userId: "user-1",
      role: "manager",
    });
    assertPermission.mockResolvedValue(undefined);
  });

  it("returns a typed failure when mutate throws", async () => {
    const { runManagerMutation } = await import(
      "@/lib/actions/run-manager-action"
    );

    const result = await runManagerMutation({
      data: { id: "1" },
      permission: PERMISSIONS.CLASSES_VIEW,
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
