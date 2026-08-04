import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const forbiddenMock = vi.fn(() => {
  throw new Error("NEXT_FORBIDDEN");
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  forbidden: () => forbiddenMock(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
  getSessionRole: vi.fn(),
}));

vi.mock("@/services/authorization.service", () => ({
  getUserPermissionsCached: vi.fn(),
  hasPermissionInSet: vi.fn(
    (permissions: ReadonlySet<string>, permission: string) =>
      permissions.has(permission)
  ),
}));

import { getSessionRole, getSessionUser } from "@/lib/auth/session";
import { requireManagerRoutePermission } from "@/lib/auth/require-manager-route-permission";
import { ROLES } from "@/lib/constants/roles";
import { getUserPermissionsCached } from "@/services/authorization.service";

describe("requireManagerRoutePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows access when the required view permission is present", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getUserPermissionsCached).mockResolvedValue(
      new Set([PERMISSIONS.SUBJECTS_VIEW])
    );

    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_SUBJECTS)
    ).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(forbiddenMock).not.toHaveBeenCalled();
  });

  it("redirects to the session role dashboard when denied", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getSessionRole).mockResolvedValue(ROLES.TRAINER);
    vi.mocked(getUserPermissionsCached).mockResolvedValue(
      new Set([PERMISSIONS.WORKSHOPS_VIEW])
    );

    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_WORKSHOPS_PAYMENTS)
    ).rejects.toThrow(`NEXT_REDIRECT:${ROUTES.TRAINER_DASHBOARD}`);
    expect(redirectMock).toHaveBeenCalledWith(ROUTES.TRAINER_DASHBOARD);
  });

  it("redirects managers to manager dashboard when denied", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getSessionRole).mockResolvedValue(ROLES.MANAGER);
    vi.mocked(getUserPermissionsCached).mockResolvedValue(
      new Set([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.SUBJECTS_VIEW])
    );

    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_USERS)
    ).rejects.toThrow(`NEXT_REDIRECT:${ROUTES.MANAGER_DASHBOARD}`);
    expect(redirectMock).toHaveBeenCalledWith(ROUTES.MANAGER_DASHBOARD);
  });

  it("calls forbidden when denied without a session role", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getSessionRole).mockResolvedValue(null);
    vi.mocked(getUserPermissionsCached).mockResolvedValue(
      new Set([PERMISSIONS.SUBJECTS_VIEW])
    );

    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_USERS)
    ).rejects.toThrow("NEXT_FORBIDDEN");
    expect(forbiddenMock).toHaveBeenCalled();
  });

  it("calls forbidden for unmapped manager paths", async () => {
    await expect(
      requireManagerRoutePermission("/manager/unknown-feature")
    ).rejects.toThrow("NEXT_FORBIDDEN");
    expect(forbiddenMock).toHaveBeenCalled();
  });
});
