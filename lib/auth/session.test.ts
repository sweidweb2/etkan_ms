import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";

describe("getSessionPack", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadSessionModule(realShellCache = false) {
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerComponentClient: vi.fn(async () => ({})),
    }));
    vi.doMock("@/services/auth/auth.service", () => ({
      getSessionAuthIdentity: vi.fn(),
    }));
    vi.doMock("@/repositories/profile.repository", () => ({
      findProfileById: vi.fn(),
    }));
    vi.doMock("@/repositories/student-profile.repository", () => ({
      findStudentProfileByUserId: vi.fn(),
    }));
    vi.doMock("@/services/auth/authorization.service", () => ({
      getPermissionsForRoleCached: vi.fn(),
      rememberUserRole: vi.fn(),
    }));
    vi.doMock("@/lib/auth/session-shell-cache", async (importOriginal) => {
      if (realShellCache) {
        return await importOriginal<
          typeof import("@/lib/auth/session-shell-cache")
        >();
      }
      return {
        getCachedSessionShell: vi.fn(),
        setCachedSessionShell: vi.fn(),
        isSessionShellCompatibleWithClaims: vi.fn(
          (_entry: unknown, claimsRole: unknown) => claimsRole == null || true
        ),
        getOrCreateSessionShellInflight: vi.fn(
          async (_userId: string, build: () => Promise<unknown>) => ({
            payload: await build(),
            shared: false,
          })
        ),
      };
    });
    vi.doMock("@/services/auth/role.service", async () => {
      const actual = await vi.importActual<
        typeof import("@/services/auth/role.service")
      >("@/services/auth/role.service");
      return actual;
    });
    vi.doMock("@/services/auth/user-display.service", async () => {
      const actual = await vi.importActual<
        typeof import("@/services/auth/user-display.service")
      >("@/services/auth/user-display.service");
      return actual;
    });

    const session = await import("@/lib/auth/session");
    const { getSessionAuthIdentity } = await import("@/services/auth/auth.service");
    const profileRepository = await import("@/repositories/profile.repository");
    const studentProfileRepository = await import(
      "@/repositories/student-profile.repository"
    );
    const { getPermissionsForRoleCached, rememberUserRole } = await import(
      "@/services/auth/authorization.service"
    );
    const shellCache = await import("@/lib/auth/session-shell-cache");

    return {
      session,
      getSessionAuthIdentity: vi.mocked(getSessionAuthIdentity),
      findProfileById: vi.mocked(profileRepository.findProfileById),
      findStudentProfileByUserId: vi.mocked(
        studentProfileRepository.findStudentProfileByUserId
      ),
      getPermissionsForRoleCached: vi.mocked(getPermissionsForRoleCached),
      rememberUserRole: vi.mocked(rememberUserRole),
      getCachedSessionShell: vi.mocked(shellCache.getCachedSessionShell),
      setCachedSessionShell: vi.mocked(shellCache.setCachedSessionShell),
      isSessionShellCompatibleWithClaims: vi.mocked(
        shellCache.isSessionShellCompatibleWithClaims
      ),
    };
  }

  it("returns an empty pack when there is no user", async () => {
    const mod = await loadSessionModule();
    mod.getSessionAuthIdentity.mockResolvedValue(null);

    const pack = await mod.session.getSessionPack();

    expect(pack).toEqual({
      user: null,
      role: null,
      displayName: "User",
      isInstructor: false,
      permissions: new Set(),
    });
    expect(mod.findProfileById).not.toHaveBeenCalled();
    expect(mod.getPermissionsForRoleCached).not.toHaveBeenCalled();
  });

  it("builds a signed-in pack from one profile fetch + role permissions and stores shell", async () => {
    const mod = await loadSessionModule();
    const user = {
      id: "user-pack-1",
      email: "ada@school.com",
      user_metadata: { full_name: "Ada Manager" },
      app_metadata: {},
    } as never;
    const permissions = new Set([PERMISSIONS.DASHBOARD_VIEW]);

    mod.getCachedSessionShell.mockReturnValue(null);
    mod.getSessionAuthIdentity.mockResolvedValue({
      user,
      claimsRole: null,
    });
    mod.findProfileById.mockResolvedValue({
      data: {
        id: "user-pack-1",
        username: "ada",
        role: ROLES.MANAGER,
        is_instructor: true,
        created_at: "2026-01-01",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    mod.getPermissionsForRoleCached.mockResolvedValue(permissions);

    const pack = await mod.session.getSessionPack();

    expect(pack).toEqual({
      user,
      role: ROLES.MANAGER,
      displayName: "Ada Manager",
      isInstructor: true,
      permissions,
    });
    expect(mod.findProfileById).toHaveBeenCalledTimes(1);
    expect(mod.findStudentProfileByUserId).not.toHaveBeenCalled();
    expect(mod.rememberUserRole).toHaveBeenCalledWith(
      "user-pack-1",
      ROLES.MANAGER
    );
    expect(mod.getPermissionsForRoleCached).toHaveBeenCalledWith(ROLES.MANAGER);
    expect(mod.setCachedSessionShell).toHaveBeenCalledWith(
      "user-pack-1",
      expect.objectContaining({
        role: ROLES.MANAGER,
        displayName: "Ada Manager",
        isInstructor: true,
        permissionKeys: [PERMISSIONS.DASHBOARD_VIEW],
        cachedClaimsRole: null,
      })
    );
  });

  it("returns shell cache hit without profile or permissions DB", async () => {
    const mod = await loadSessionModule();
    const user = {
      id: "user-pack-2",
      email: "ceo@school.com",
      user_metadata: { full_name: "Ceo User" },
      app_metadata: { role: ROLES.CEO },
    } as never;

    mod.getSessionAuthIdentity.mockResolvedValue({
      user,
      claimsRole: ROLES.CEO,
    });
    mod.getCachedSessionShell.mockReturnValue({
      role: ROLES.CEO,
      displayName: "Ceo User",
      isInstructor: false,
      permissionKeys: [PERMISSIONS.WORKSHOPS_VIEW],
      cachedClaimsRole: ROLES.CEO,
    });
    mod.isSessionShellCompatibleWithClaims.mockReturnValue(true);

    const pack = await mod.session.getSessionPack();

    expect(pack.role).toBe(ROLES.CEO);
    expect(pack.displayName).toBe("Ceo User");
    expect(pack.permissions.has(PERMISSIONS.WORKSHOPS_VIEW)).toBe(true);
    expect(mod.findProfileById).not.toHaveBeenCalled();
    expect(mod.getPermissionsForRoleCached).not.toHaveBeenCalled();
    expect(mod.rememberUserRole).toHaveBeenCalledWith("user-pack-2", ROLES.CEO);
    expect(mod.setCachedSessionShell).not.toHaveBeenCalled();
  });

  it("misses shell cache when claims role is incompatible", async () => {
    const mod = await loadSessionModule();
    const user = {
      id: "user-pack-3",
      email: "ceo@school.com",
      user_metadata: { full_name: "Ceo User" },
      app_metadata: { role: ROLES.MANAGER },
    } as never;
    const permissions = new Set([PERMISSIONS.WORKSHOPS_VIEW]);

    mod.getSessionAuthIdentity.mockResolvedValue({
      user,
      claimsRole: ROLES.MANAGER,
    });
    mod.getCachedSessionShell.mockReturnValue({
      role: ROLES.CEO,
      displayName: "Ceo User",
      isInstructor: false,
      permissionKeys: [PERMISSIONS.WORKSHOPS_VIEW],
      cachedClaimsRole: ROLES.CEO,
    });
    mod.isSessionShellCompatibleWithClaims.mockReturnValue(false);
    mod.findProfileById.mockResolvedValue({
      data: {
        id: "user-pack-3",
        username: "mgr",
        role: ROLES.MANAGER,
        is_instructor: false,
        created_at: "2026-01-01",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    mod.getPermissionsForRoleCached.mockResolvedValue(permissions);

    const pack = await mod.session.getSessionPack();

    expect(pack.role).toBe(ROLES.MANAGER);
    expect(mod.findProfileById).toHaveBeenCalled();
    expect(mod.getPermissionsForRoleCached).toHaveBeenCalledWith(ROLES.MANAGER);
  });

  it("on MISS with claimsRole, loads profile and permissions in parallel for claimsRole", async () => {
    const mod = await loadSessionModule();
    const user = {
      id: "user-pack-4",
      email: "mgr@school.com",
      user_metadata: { full_name: "Mgr User" },
      app_metadata: { role: ROLES.MANAGER },
    } as never;
    const permissions = new Set([PERMISSIONS.DASHBOARD_VIEW]);

    mod.getCachedSessionShell.mockReturnValue(null);
    mod.getSessionAuthIdentity.mockResolvedValue({
      user,
      claimsRole: ROLES.MANAGER,
    });
    mod.findProfileById.mockResolvedValue({
      data: {
        id: "user-pack-4",
        username: "mgr",
        role: ROLES.TEACHER, // profile disagrees; claims win
        is_instructor: false,
        created_at: "2026-01-01",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    mod.getPermissionsForRoleCached.mockResolvedValue(permissions);

    const pack = await mod.session.getSessionPack();

    expect(pack.role).toBe(ROLES.MANAGER);
    expect(pack.permissions).toEqual(permissions);
    expect(mod.findProfileById).toHaveBeenCalledTimes(1);
    expect(mod.getPermissionsForRoleCached).toHaveBeenCalledTimes(1);
    expect(mod.getPermissionsForRoleCached).toHaveBeenCalledWith(ROLES.MANAGER);
    expect(mod.setCachedSessionShell).toHaveBeenCalledWith(
      "user-pack-4",
      expect.objectContaining({
        role: ROLES.MANAGER,
        cachedClaimsRole: ROLES.MANAGER,
      })
    );
  });

  it("coalesces overlapping MISSes for the same user into one profile + permissions build", async () => {
    const mod = await loadSessionModule(true);
    const { clearCachedSessionShell } = await import(
      "@/lib/auth/session-shell-cache"
    );
    clearCachedSessionShell();

    const user = {
      id: "user-pack-sf",
      email: "mgr@school.com",
      user_metadata: { full_name: "Mgr User" },
      app_metadata: { role: ROLES.MANAGER },
    } as never;
    const permissions = new Set([PERMISSIONS.DASHBOARD_VIEW]);

    mod.getSessionAuthIdentity.mockResolvedValue({
      user,
      claimsRole: ROLES.MANAGER,
    });

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mod.findProfileById.mockImplementation(async () => {
      await gate;
      return {
        data: {
          id: "user-pack-sf",
          username: "mgr",
          role: ROLES.MANAGER,
          is_instructor: false,
          created_at: "2026-01-01",
        },
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      };
    });
    mod.getPermissionsForRoleCached.mockResolvedValue(permissions);

    const first = mod.session.loadSessionPack();
    const second = mod.session.loadSessionPack();
    release();
    const [packA, packB] = await Promise.all([first, second]);

    expect(packA.role).toBe(ROLES.MANAGER);
    expect(packB.role).toBe(ROLES.MANAGER);
    expect(mod.findProfileById).toHaveBeenCalledTimes(1);
    expect(mod.getPermissionsForRoleCached).toHaveBeenCalledTimes(1);

    clearCachedSessionShell();
  });
});
