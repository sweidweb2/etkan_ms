import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { resolveDisplayName } from "@/services/auth/user-display.service";

vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/student-profile.repository");

const client = {} as never;

function authUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "jane@school.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

describe("resolveDisplayName", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("prefers student profile full name", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      {
        data: {
          id: "student-1",
          user_id: "user-1",
          full_name: "Jane Doe",
          birth_date: null,
          phone: null,
          status: "active",
          created_at: "2026-01-01",
        },
        error: null,
      }
    );

    await expect(resolveDisplayName(client, authUser())).resolves.toBe("Jane Doe");
    expect(profileRepository.findProfileById).not.toHaveBeenCalled();
  });

  it("prefers auth metadata full name without hitting the DB", async () => {
    await expect(
      resolveDisplayName(
        client,
        authUser({ user_metadata: { full_name: " Metadata Name " } })
      )
    ).resolves.toBe("Metadata Name");
    expect(
      studentProfileRepository.findStudentProfileByUserId
    ).not.toHaveBeenCalled();
    expect(profileRepository.findProfileById).not.toHaveBeenCalled();
  });

  it("falls back to profile full name then email prefix", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      {
        data: null,
        error: null,
      }
    );
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        full_name: "Jane Profile",
        role: "student",
        created_at: "2026-01-01",
      },
      error: null,
    });

    await expect(resolveDisplayName(client, authUser())).resolves.toBe(
      "Jane Profile"
    );
  });

  it("uses email prefix when nothing else is available", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      {
        data: null,
        error: null,
      }
    );
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(resolveDisplayName(client, authUser())).resolves.toBe("jane");
  });
});
