import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { login, logout, register } from "@/services/auth.service";
import * as profileService from "@/services/profile.service";
import * as roleService from "@/services/role.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/services/profile.service");
vi.mock("@/services/role.service");

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
  });

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
    vi.mocked(roleService.resolveUserRole).mockResolvedValue(ROLES.MANAGER);

    const result = await login(authClient, {
      email: "jane@school.com",
      password: "secret123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.redirectTo).toBe(ROUTES.MANAGER_DASHBOARD);
    }
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
      expect(result.redirectTo).toContain(ROUTES.STUDENT_DASHBOARD);
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
