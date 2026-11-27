import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearClaimsRoleOverride,
  markClaimsRoleOverride,
} from "@/lib/auth/claims-role-override-cache";
import {
  clearCachedMaintenanceMode,
  getCachedMaintenanceMode,
  setCachedMaintenanceMode,
} from "@/lib/auth/maintenance-mode-cache";
import {
  roleFromAuthMetadata,
  roleFromJwtClaims,
  resolveUserRoleForMiddleware,
} from "@/services/auth/role.service";
import { ROLES } from "@/lib/constants/roles";
import * as profileRepository from "@/repositories/profile.repository";

vi.mock("@/repositories/profile.repository");
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({})),
}));

describe("maintenance-mode-cache", () => {
  beforeEach(() => {
    clearCachedMaintenanceMode();
  });

  it("returns null when empty", () => {
    expect(getCachedMaintenanceMode()).toBeNull();
  });

  it("returns cached value within TTL", () => {
    setCachedMaintenanceMode(true, 60_000);
    expect(getCachedMaintenanceMode()).toBe(true);
  });

  it("expires after TTL", () => {
    setCachedMaintenanceMode(false, -1);
    expect(getCachedMaintenanceMode()).toBeNull();
  });
});

describe("roleFromJwtClaims / roleFromAuthMetadata", () => {
  it("reads app_metadata.role from claims", () => {
    expect(
      roleFromJwtClaims({
        app_metadata: { role: ROLES.MANAGER },
      })
    ).toBe(ROLES.MANAGER);
  });

  it("ignores user_metadata.role on auth user", () => {
    expect(
      roleFromAuthMetadata({
        id: "u1",
        app_metadata: {},
        user_metadata: { role: ROLES.CEO },
        aud: "authenticated",
        created_at: "",
      } as never)
    ).toBeNull();
  });

  it("ignores user_metadata.role on JWT claims", () => {
    expect(
      roleFromJwtClaims({
        user_metadata: { role: ROLES.MANAGER },
      })
    ).toBeNull();
  });
});

describe("resolveUserRoleForMiddleware", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearClaimsRoleOverride();
  });

  afterEach(() => {
    clearClaimsRoleOverride();
  });

  it("returns claims role without hitting the database", async () => {
    const role = await resolveUserRoleForMiddleware({} as never, {
      userId: "u1",
      claimsRole: ROLES.MANAGER,
    });
    expect(role).toBe(ROLES.MANAGER);
    expect(profileRepository.findRoleById).not.toHaveBeenCalled();
  });

  it("forces demoted override over stale elevated JWT claims", async () => {
    markClaimsRoleOverride("u1", ROLES.STUDENT);
    const role = await resolveUserRoleForMiddleware({} as never, {
      userId: "u1",
      claimsRole: ROLES.MANAGER,
    });
    expect(role).toBe(ROLES.STUDENT);
    expect(profileRepository.findRoleById).not.toHaveBeenCalled();
  });

  it("falls back to profiles.role when claims lack role", async () => {
    vi.mocked(profileRepository.findRoleById).mockResolvedValue({
      data: { role: ROLES.TEACHER },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    const role = await resolveUserRoleForMiddleware({} as never, {
      userId: "u1",
      claimsRole: null,
    });
    expect(role).toBe(ROLES.TEACHER);
    expect(profileRepository.findRoleById).toHaveBeenCalled();
  });
});
