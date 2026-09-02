import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import * as appSettingsRepository from "@/repositories/app-settings.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { setCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { login, logout, register, getSessionAuthIdentity } from "@/services/auth/auth.service";
import * as profileService from "@/services/auth/profile.service";
import * as roleService from "@/services/auth/role.service";
import * as authorizationService from "@/services/auth/authorization.service";

vi.mock("@/repositories/app-settings.repository");
vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/services/auth/profile.service");
vi.mock("@/lib/auth/session-shell-cache", () => ({
  setCachedSessionShell: vi.fn(),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  getPermissionsForRoleCached: vi.fn(async () => new Set()),
}));
vi.mock("@/services/auth/role.service", async () => {
  const actual = await vi.importActual<typeof import("@/services/auth/role.service")>(
    "@/services/auth/role.service"
  );
  return {
    ...actual,
    resolveUserRole: vi.fn(),
    syncAuthUserRole: vi.fn(),
  };
});

const authClient = {} as never;
const adminClient = {} as never;

const authUser = {
  id: "user-1",
  email: "jane@school.com",
  app_metadata: {},
  user_metadata: { full_name: "Jane Doe" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

const validRegisterInput = {
  username: "jane",
  fullName: "Jane Doe",
  email: "jane@school.com",
  password: "secret123",
  confirmPassword: "secret123",
  birthDate: "",
  phone: "",
};

describe("login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(appSettingsRepository.getMaintenanceMode).mockResolvedValue(
      false
    );
    vi.mocked(authorizationService.getPermissionsForRoleCached).mockResolvedValue(
      new Set()
    );
  });

  function mockProfileRole(role: (typeof ROLES)[keyof typeof ROLES]) {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "jane",
        role,
        is_instructor: false,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);
  }

  it("returns field errors for invalid input", async () => {
    const result = await login(authClient, {
      email: "bad-email",
      password: "1234",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("maps invalid credentials to a friendly error", async () => {
    vi.mocked(authRepository.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "Invalid login credentials",
        name: "AuthApiError",
        status: 400,
      },
    });

    const result = await login(authClient, {
      email: "jane@school.com",
      password: "wrong",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid email or password.");
    }
  });

  it("redirects to the role dashboard on success", async () => {
    vi.mocked(authRepository.signInWithPassword).mockResolvedValue({
      data: { user: authUser, session: {} as never },
      error: null,
    });
    mockProfileRole(ROLES.MANAGER);

    const result = await login(authClient, {
      email: "jane@school.com",
      password: "secret123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.redirectTo).toBe(ROUTES.MANAGER_STUDENTS);
    }
    expect(setCachedSessionShell).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        role: ROLES.MANAGER,
        displayName: "Jane Doe",
      })
    );
  });

  it("allows student login when maintenance mode is off", async () => {
    vi.mocked(authRepository.signInWithPassword).mockResolvedValue({
      data: { user: authUser, session: {} as never },
      error: null,
    });
    mockProfileRole(ROLES.STUDENT);
    vi.mocked(appSettingsRepository.getMaintenanceMode).mockResolvedValue(
      false
    );

    const result = await login(authClient, {
      email: "jane@school.com",
      password: "secret123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.redirectTo).toBe(ROUTES.STUDENT_ROOT);
    }
    expect(authRepository.signOut).not.toHaveBeenCalled();
  });

  it("rejects student login when maintenance mode is on", async () => {
    vi.mocked(authRepository.signInWithPassword).mockResolvedValue({
      data: { user: authUser, session: {} as never },
      error: null,
    });
    mockProfileRole(ROLES.STUDENT);
    vi.mocked(appSettingsRepository.getMaintenanceMode).mockResolvedValue(true);
    vi.mocked(authRepository.signOut).mockResolvedValue({ error: null });

    const result = await login(authClient, {
      email: "jane@school.com",
      password: "secret123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "The app is under maintenance. Please try again later."
      );
    }
    expect(authRepository.signOut).toHaveBeenCalledWith(authClient);
  });

  it("rejects teacher login when maintenance mode is on", async () => {
    vi.mocked(authRepository.signInWithPassword).mockResolvedValue({
      data: { user: authUser, session: {} as never },
      error: null,
    });
    mockProfileRole(ROLES.TEACHER);
    vi.mocked(appSettingsRepository.getMaintenanceMode).mockResolvedValue(true);
    vi.mocked(authRepository.signOut).mockResolvedValue({ error: null });

    const result = await login(authClient, {
      email: "jane@school.com",
      password: "secret123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "The app is under maintenance. Please try again later."
      );
    }
    expect(authRepository.signOut).toHaveBeenCalledWith(authClient);
  });

  it("allows manager login when maintenance mode is on", async () => {
    vi.mocked(authRepository.signInWithPassword).mockResolvedValue({
      data: { user: authUser, session: {} as never },
      error: null,
    });
    mockProfileRole(ROLES.MANAGER);
    vi.mocked(appSettingsRepository.getMaintenanceMode).mockResolvedValue(true);

    const result = await login(authClient, {
      email: "jane@school.com",
      password: "secret123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.redirectTo).toBe(ROUTES.MANAGER_STUDENTS);
    }
    expect(authRepository.signOut).not.toHaveBeenCalled();
    expect(appSettingsRepository.getMaintenanceMode).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when sign out fails", async () => {
    vi.mocked(authRepository.signOut).mockResolvedValue({
      error: { message: "sign out failed", name: "AuthError", status: 500 },
    });

    await expect(logout(authClient)).rejects.toThrow("sign out failed");
  });
});

describe("register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects taken usernames before creating auth user", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: { id: "existing", username: "jane" },
      error: null,
    });

    const result = await register(authClient, adminClient, validRegisterInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("This username is already taken.");
    }
    expect(authRepository.signUp).not.toHaveBeenCalled();
  });

  it("creates auth user and student records on success", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(authRepository.signUp).mockResolvedValue({
      data: {
        user: authUser,
        session: {} as never,
      },
      error: null,
    });
    vi.mocked(profileService.ensureStudentRegistration).mockResolvedValue({
      profileId: "user-1",
    });
    vi.mocked(roleService.syncAuthUserRole).mockResolvedValue(undefined);

    const result = await register(authClient, adminClient, validRegisterInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.requiresEmailConfirmation).toBe(false);
      expect(result.redirectTo).toContain(ROUTES.STUDENT_ROOT);
      expect(result.redirectTo).toContain("toast=signed_up");
    }
    expect(profileService.ensureStudentRegistration).toHaveBeenCalled();
    expect(roleService.syncAuthUserRole).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      ROLES.STUDENT
    );
  });

  it("deletes auth user when profile creation fails", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(authRepository.signUp).mockResolvedValue({
      data: {
        user: authUser,
        session: {} as never,
      },
      error: null,
    });
    vi.mocked(profileService.ensureStudentRegistration).mockRejectedValue(
      new Error("profile failed")
    );
    vi.mocked(authRepository.deleteAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    const result = await register(authClient, adminClient, validRegisterInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("profile failed");
    }
    expect(authRepository.deleteAuthUser).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
  });

  it("returns confirm-email flow when session is missing", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(authRepository.signUp).mockResolvedValue({
      data: {
        user: authUser,
        session: null,
      },
      error: null,
    });
    vi.mocked(profileService.ensureStudentRegistration).mockResolvedValue({
      profileId: "user-1",
    });
    vi.mocked(roleService.syncAuthUserRole).mockResolvedValue(undefined);

    const result = await register(authClient, adminClient, validRegisterInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.requiresEmailConfirmation).toBe(true);
      expect(result.redirectTo).toBe(`${ROUTES.LOGIN}?message=confirm_email`);
    }
  });
});

describe("getSessionAuthIdentity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("prefers getClaims over getUser when JWT sub is present", async () => {
    vi.mocked(authRepository.getClaims).mockResolvedValue({
      data: {
        claims: {
          sub: "user-claims-1",
          email: "ceo@school.com",
          app_metadata: { role: ROLES.CEO },
          user_metadata: { full_name: "Ceo User" },
        },
      },
      error: null,
    } as never);

    const identity = await getSessionAuthIdentity(authClient);

    expect(identity?.user.id).toBe("user-claims-1");
    expect(identity?.user.email).toBe("ceo@school.com");
    expect(identity?.claimsRole).toBe(ROLES.CEO);
    expect(authRepository.getUser).not.toHaveBeenCalled();
  });

  it("falls back to getUser when claims are unavailable", async () => {
    vi.mocked(authRepository.getClaims).mockResolvedValue({
      data: { claims: null },
      error: { message: "no claims", name: "AuthError", status: 400 },
    } as never);
    vi.mocked(authRepository.getUser).mockResolvedValue({
      data: {
        user: {
          ...authUser,
          app_metadata: { role: ROLES.MANAGER },
        },
      },
      error: null,
    } as never);

    const identity = await getSessionAuthIdentity(authClient);

    expect(identity?.user.id).toBe("user-1");
    expect(identity?.claimsRole).toBe(ROLES.MANAGER);
    expect(authRepository.getUser).toHaveBeenCalled();
  });
});
