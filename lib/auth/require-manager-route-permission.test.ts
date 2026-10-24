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
  getSessionPack: vi.fn(),
}));

vi.mock("@/services/auth/authorization.service", () => ({
  hasPermissionInSet: vi.fn(
    (permissions: ReadonlySet<string>, permission: string) =>
      permissions.has(permission)
  ),
}));

import { getSessionPack } from "@/lib/auth/session";
import { requireManagerRoutePermission } from "@/lib/auth/require-manager-route-permission";
import { ROLES } from "@/lib/constants/roles";

function pack(overrides: {
  userId?: string | null;
  role?: (typeof ROLES)[keyof typeof ROLES] | null;
  permissions?: ReadonlySet<string>;
}) {
  return {
    user: overrides.userId ? ({ id: overrides.userId } as never) : null,
    role: overrides.role ?? null,
    displayName: "Test",
    isInstructor: false,
    permissions: overrides.permissions ?? new Set<string>(),
  };
}

describe("requireManagerRoutePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows access when the required view permission is present", async () => {
    vi.mocked(getSessionPack).mockResolvedValue(
      pack({
        userId: "user-1",
        role: ROLES.MANAGER,
        permissions: new Set([PERMISSIONS.SUBJECTS_VIEW]),
      }) as never
    );

    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_SUBJECTS)
    ).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(forbiddenMock).not.toHaveBeenCalled();
  });

  it("redirects to the session role dashboard when denied", async () => {
    vi.mocked(getSessionPack).mockResolvedValue(
      pack({
        userId: "user-1",
        role: ROLES.TEACHER,
        permissions: new Set([PERMISSIONS.WORKSHOPS_VIEW]),
      }) as never
    );

    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_WORKSHOPS_PAYMENTS)
    ).rejects.toThrow(`NEXT_REDIRECT:${ROUTES.TEACHER_CLASSES}`);
    expect(redirectMock).toHaveBeenCalledWith(ROUTES.TEACHER_CLASSES);
  });

  it("allows the manager root so it can bounce to manage students", async () => {
    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_ROOT)
    ).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(forbiddenMock).not.toHaveBeenCalled();
  });

  it("redirects managers to manage students when denied", async () => {
    vi.mocked(getSessionPack).mockResolvedValue(
      pack({
        userId: "user-1",
        role: ROLES.MANAGER,
        permissions: new Set([
          PERMISSIONS.STUDENTS_VIEW,
          PERMISSIONS.SUBJECTS_VIEW,
        ]),
      }) as never
    );

    await expect(
      requireManagerRoutePermission(ROUTES.MANAGER_USERS)
    ).rejects.toThrow(`NEXT_REDIRECT:${ROUTES.MANAGER_STUDENTS}`);
    expect(redirectMock).toHaveBeenCalledWith(ROUTES.MANAGER_STUDENTS);
  });

  it("calls forbidden when denied without a session role", async () => {
    vi.mocked(getSessionPack).mockResolvedValue(
      pack({
        userId: "user-1",
        role: null,
        permissions: new Set([PERMISSIONS.SUBJECTS_VIEW]),
      }) as never
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
