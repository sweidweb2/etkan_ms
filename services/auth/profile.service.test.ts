import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  ensureStudentRegistration,
  generateUniqueUsername,
} from "@/services/auth/profile.service";

vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/student-profile.repository");

const client = {} as never;

describe("generateUniqueUsername", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns base username when available", async () => {
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(generateUniqueUsername(client, "jane@school.com")).resolves.toBe(
      "jane"
    );
  });

  it("adds suffix when base username is taken", async () => {
    vi.mocked(profileRepository.findProfileByUsername)
      .mockResolvedValueOnce({
        data: { id: "existing", username: "jane" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      });

    await expect(generateUniqueUsername(client, "jane@school.com")).resolves.toBe(
      "jane1"
    );
  });
});

describe("ensureStudentRegistration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates profile and student profile for a new user", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: { id: "user-1", role: ROLES.STUDENT },
      error: null,
    });
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      {
        data: null,
        error: null,
      }
    );
    vi.mocked(studentProfileRepository.createStudentProfile).mockResolvedValue({
      data: { id: "student-1", user_id: "user-1" },
      error: null,
    });

    const result = await ensureStudentRegistration(client, {
      authId: "user-1",
      username: "jane",
      email: "jane@school.com",
      fullName: "Jane Doe",
    });

    expect(result.profileId).toBe("user-1");
    expect(profileRepository.createProfile).toHaveBeenCalledWith(client, {
      id: "user-1",
      username: "jane",
      role: ROLES.STUDENT,
    });
    expect(studentProfileRepository.createStudentProfile).toHaveBeenCalled();
  });

  it("skips profile creation when profile already exists", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "jane",
        role: ROLES.STUDENT,
        created_at: "2026-01-01",
      },
      error: null,
    });
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

    const result = await ensureStudentRegistration(client, {
      authId: "user-1",
      email: "jane@school.com",
      fullName: "Jane Doe",
    });

    expect(result.profileId).toBe("user-1");
    expect(profileRepository.createProfile).not.toHaveBeenCalled();
    expect(studentProfileRepository.createStudentProfile).not.toHaveBeenCalled();
  });

  it("creates student profile when profile exists but student row is missing", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: {
        id: "user-1",
        username: "jane",
        role: ROLES.STUDENT,
        created_at: "2026-01-01",
      },
      error: null,
    });
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      {
        data: null,
        error: null,
      }
    );
    vi.mocked(studentProfileRepository.createStudentProfile).mockResolvedValue({
      data: { id: "student-1", user_id: "user-1" },
      error: null,
    });

    await ensureStudentRegistration(client, {
      authId: "user-1",
      email: "jane@school.com",
      fullName: "Jane Doe",
    });

    expect(studentProfileRepository.createStudentProfile).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        user_id: "user-1",
        full_name: "Jane Doe",
      })
    );
  });

  it("rolls back profile when student profile creation fails", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(profileRepository.findProfileByUsername).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(profileRepository.createProfile).mockResolvedValue({
      data: { id: "user-1", role: ROLES.STUDENT },
      error: null,
    });
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      {
        data: null,
        error: null,
      }
    );
    vi.mocked(studentProfileRepository.createStudentProfile).mockResolvedValue({
      data: null,
      error: { message: "insert failed", code: "500", details: "", hint: "" },
    });
    vi.mocked(profileRepository.deleteProfileById).mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      ensureStudentRegistration(client, {
        authId: "user-1",
        username: "jane",
        email: "jane@school.com",
        fullName: "Jane Doe",
      })
    ).rejects.toThrow("insert failed");

    expect(profileRepository.deleteProfileById).toHaveBeenCalledWith(
      client,
      "user-1"
    );
  });
});
