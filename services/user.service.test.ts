import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { ROLES } from "@/lib/constants/roles";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as roleService from "@/services/role.service";
import { createStaffUser, listUsersForManager } from "@/services/user.service";

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/services/role.service");

const adminClient = {} as never;

const authUser = {
  id: "user-1",
  email: "teacher@school.com",
  app_metadata: { role: ROLES.TEACHER },
  user_metadata: { full_name: "teacher1", username: "teacher1" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

const validStaffInput = {
  username: "teacher1",
  email: "teacher@school.com",
  password: "secret123",
  role: ROLES.TEACHER,
};

describe("listUsersForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when actor is not a manager", async () => {
    await expect(
      listUsersForManager(adminClient, ROLES.TEACHER)
    ).rejects.toThrow("Unauthorized.");
  });

  it("returns users with emails merged from auth", async () => {
    vi.mocked(profileRepository.listProfiles).mockResolvedValue({
      data: [
        {
          id: "user-1",
          username: "teacher1",
          role: ROLES.TEACHER,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.getAuthUserById).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    const users = await listUsersForManager(adminClient, ROLES.MANAGER);

    expect(users).toEqual([
      {
        id: "user-1",
        username: "teacher1",
        role: ROLES.TEACHER,
        created_at: "2026-01-01T00:00:00.000Z",
        email: "teacher@school.com",
      },
    ]);
  });
});

describe("createStaffUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects non-manager actors", async () => {
    const result = await createStaffUser(adminClient, ROLES.TEACHER, validStaffInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
  });

  it("returns field errors for invalid input", async () => {
    const result = await createStaffUser(adminClient, ROLES.MANAGER, {
      ...validStaffInput,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("rejects student role", async () => {
    const result = await createStaffUser(adminClient, ROLES.MANAGER, {
      ...validStaffInput,
      role: ROLES.STUDENT,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.role).toBeDefined();
    }
  });

  it("returns username duplicate error", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: { id: "existing", username: "teacher1" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    const result = await createStaffUser(
      adminClient,
      ROLES.MANAGER,
      validStaffInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.username).toEqual([
        "This username is already taken.",
      ]);
    }
  });

  it("returns email duplicate error", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    const result = await createStaffUser(
      adminClient,
      ROLES.MANAGER,
      validStaffInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toEqual(["This email is already in use."]);
    }
  });

  it("creates auth user, profile, and syncs role on success", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(authRepository.createAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: { id: "user-1", role: ROLES.TEACHER },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(roleService.syncAuthUserRole).mockResolvedValue(undefined);

    const result = await createStaffUser(
      adminClient,
      ROLES.MANAGER,
      validStaffInput
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe("teacher@school.com");
      expect(result.message).toBe("Staff account created.");
    }

    expect(authRepository.createAuthUser).toHaveBeenCalledWith(adminClient, {
      email: "teacher@school.com",
      password: "secret123",
      username: "teacher1",
      fullName: "teacher1",
      role: ROLES.TEACHER,
    });
    expect(profileRepository.createProfile).toHaveBeenCalled();
    expect(roleService.syncAuthUserRole).toHaveBeenCalledWith(
      adminClient,
      "user-1",
      ROLES.TEACHER
    );
  });

  it("rolls back auth user when profile creation fails", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    vi.mocked(authRepository.findAuthUserByEmail).mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(authRepository.createAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: null,
      error: { message: "Profile insert failed.", name: "PostgrestError", details: "", hint: "", code: "500" },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    });

    vi.mocked(authRepository.deleteAuthUser).mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    const result = await createStaffUser(
      adminClient,
      ROLES.MANAGER,
      validStaffInput
    );

    expect(result.success).toBe(false);
    expect(authRepository.deleteAuthUser).toHaveBeenCalledWith(
      adminClient,
      "user-1"
    );
  });
});
