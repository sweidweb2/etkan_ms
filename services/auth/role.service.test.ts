import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { ROLES } from "@/lib/constants/roles";
import * as profileRepository from "@/repositories/profile.repository";
import { resolveUserRole, syncAuthUserRole } from "@/services/auth/role.service";
import * as authRepository from "@/repositories/auth.repository";

vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/auth.repository");

const client = {} as never;

function authUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

describe("resolveUserRole", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns role from profiles table when valid", async () => {
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.MANAGER },
      error: null,
    });

    const role = await resolveUserRole(client, authUser());
    expect(role).toBe(ROLES.MANAGER);
  });

  it("falls back to auth metadata when profile role is missing", async () => {
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: null,
      error: null,
    });

    const role = await resolveUserRole(
      client,
      authUser({ app_metadata: { role: ROLES.TEACHER } })
    );
    expect(role).toBe(ROLES.TEACHER);
  });

  it("defaults to student when no role is found", async () => {
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: null,
      error: null,
    });

    const role = await resolveUserRole(client, authUser());
    expect(role).toBe(ROLES.STUDENT);
  });
});

describe("syncAuthUserRole", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates auth metadata via repository", async () => {
    vi.mocked(authRepository.updateAuthUserRole).mockResolvedValue({
      data: { user: authUser() },
      error: null,
    });

    await expect(
      syncAuthUserRole(client, "user-1", ROLES.ADMIN)
    ).resolves.toBeUndefined();

    expect(authRepository.updateAuthUserRole).toHaveBeenCalledWith(
      client,
      "user-1",
      ROLES.ADMIN
    );
  });

  it("throws when repository returns an error", async () => {
    vi.mocked(authRepository.updateAuthUserRole).mockResolvedValue({
      data: { user: null },
      error: { message: "update failed", name: "AuthError", status: 500 },
    });

    await expect(syncAuthUserRole(client, "user-1", ROLES.ADMIN)).rejects.toThrow(
      "update failed"
    );
  });
});
