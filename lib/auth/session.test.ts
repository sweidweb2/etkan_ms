import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";

describe("getSessionPack", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadSessionModule() {
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerComponentClient: vi.fn(async () => ({})),
    }));
    vi.doMock("@/services/auth.service", () => ({
      getCurrentUser: vi.fn(),
    }));
    vi.doMock("@/services/role.service", () => ({
      resolveUserRole: vi.fn(),
      resolveIsInstructor: vi.fn(),
    }));
    vi.doMock("@/services/user-display.service", () => ({
      resolveDisplayName: vi.fn(),
    }));
    vi.doMock("@/services/authorization.service", () => ({
      getUserPermissionsCached: vi.fn(),
    }));

    const session = await import("@/lib/auth/session");
    const { getCurrentUser } = await import("@/services/auth.service");
    const { resolveUserRole, resolveIsInstructor } = await import(
      "@/services/role.service"
    );
    const { resolveDisplayName } = await import(
      "@/services/user-display.service"
    );
    const { getUserPermissionsCached } = await import(
      "@/services/authorization.service"
    );

    return {
      session,
      getCurrentUser: vi.mocked(getCurrentUser),
      resolveUserRole: vi.mocked(resolveUserRole),
      resolveIsInstructor: vi.mocked(resolveIsInstructor),
      resolveDisplayName: vi.mocked(resolveDisplayName),
      getUserPermissionsCached: vi.mocked(getUserPermissionsCached),
    };
  }

  it("returns an empty pack when there is no user", async () => {
    const mod = await loadSessionModule();
    mod.getCurrentUser.mockResolvedValue(null);

    const pack = await mod.session.getSessionPack();

    expect(pack).toEqual({
      user: null,
      role: null,
      displayName: "User",
      isInstructor: false,
      permissions: new Set(),
    });
    expect(mod.resolveUserRole).not.toHaveBeenCalled();
    expect(mod.getUserPermissionsCached).not.toHaveBeenCalled();
  });

  it("builds a signed-in pack and helpers project the same fields", async () => {
    const mod = await loadSessionModule();
    const user = { id: "user-pack-1" } as never;
    const permissions = new Set([PERMISSIONS.DASHBOARD_VIEW]);

    mod.getCurrentUser.mockResolvedValue(user);
    mod.resolveUserRole.mockResolvedValue(ROLES.MANAGER);
    mod.resolveIsInstructor.mockResolvedValue(true);
    mod.resolveDisplayName.mockResolvedValue("Ada Manager");
    mod.getUserPermissionsCached.mockResolvedValue(permissions);

    const pack = await mod.session.getSessionPack();

    expect(pack).toEqual({
      user,
      role: ROLES.MANAGER,
      displayName: "Ada Manager",
      isInstructor: true,
      permissions,
    });
    expect(mod.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(mod.getUserPermissionsCached).toHaveBeenCalledWith("user-pack-1");

    await expect(mod.session.getSessionUser()).resolves.toEqual(user);
    await expect(mod.session.getSessionRole()).resolves.toBe(ROLES.MANAGER);
    await expect(mod.session.getSessionIsInstructor()).resolves.toBe(true);
    await expect(mod.session.getSessionDisplayName()).resolves.toBe(
      "Ada Manager"
    );
    await expect(mod.session.getSessionAuditActor()).resolves.toEqual({
      userId: "user-pack-1",
      userLabel: "Ada Manager",
    });
  });
});
