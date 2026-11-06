import { beforeEach, describe, expect, it, vi } from "vitest";
import * as avatarStorageRepository from "@/repositories/avatar-storage.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { optimizeAvatarForStorage } from "@/lib/avatars/optimize-avatar";
import { recordManagerAuditLog } from "@/services/ops/audit-log.service";
import {
  removeOwnAvatar,
  removeStudentAvatarForManager,
  updateOwnAvatar,
  updateStudentAvatarForManager,
} from "@/services/students/student-avatar.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/avatars/optimize-avatar", () => ({
  optimizeAvatarForStorage: vi.fn(),
}));

vi.mock("@/repositories/avatar-storage.repository", () => ({
  uploadAvatar: vi.fn(),
  getAvatarPublicUrl: vi.fn(),
  removeAvatars: vi.fn(),
}));

vi.mock("@/repositories/profile.repository", () => ({
  findProfileAvatarUrlById: vi.fn(),
  updateProfileAvatarUrl: vi.fn(),
}));

vi.mock("@/repositories/student-profile.repository", () => ({
  findStudentProfileByUserId: vi.fn(),
}));

vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn(async () => null),
}));

vi.mock("@/services/auth/authorization.service", () => ({
  getUnauthorizedError: vi.fn(async (_client, userId) =>
    userId === "blocked" || !userId ? "Unauthorized." : null
  ),
}));

const adminClient = {} as SupabaseClient<Database>;
const actor = { userId: "manager-1", userLabel: "Manager One" };
const STORAGE_BASE = "http://localhost:8000/storage/v1/object/public/avatars";
const OLD_URL = `${STORAGE_BASE}/student-1/old.webp`;

function photo(): File {
  return new File([new Uint8Array([1, 2, 3])], "me.jpg", {
    type: "image/jpeg",
  });
}

describe("student avatar service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      { data: { id: "sp-1", user_id: "student-1" }, error: null } as never
    );
    vi.mocked(profileRepository.findProfileAvatarUrlById).mockResolvedValue({
      data: { id: "student-1", avatar_url: OLD_URL },
      error: null,
    } as never);
    vi.mocked(optimizeAvatarForStorage).mockResolvedValue({
      ok: true,
      bytes: Buffer.from([9, 9]),
    });
    vi.mocked(avatarStorageRepository.uploadAvatar).mockResolvedValue({
      error: null,
    });
    vi.mocked(avatarStorageRepository.getAvatarPublicUrl).mockImplementation(
      (_client, objectPath) => `${STORAGE_BASE}/${objectPath}`
    );
    vi.mocked(avatarStorageRepository.removeAvatars).mockResolvedValue({
      error: null,
    });
    vi.mocked(profileRepository.updateProfileAvatarUrl).mockImplementation(
      async (_client, id, avatarUrl) =>
        ({ data: { id, avatar_url: avatarUrl }, error: null }) as never
    );
  });

  it("rejects an actor without permission", async () => {
    const result = await updateStudentAvatarForManager(
      adminClient,
      "blocked",
      actor,
      "student-1",
      photo()
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(avatarStorageRepository.uploadAvatar).not.toHaveBeenCalled();
  });

  it("rejects a target that is not a student", async () => {
    vi.mocked(studentProfileRepository.findStudentProfileByUserId).mockResolvedValue(
      { data: null, error: null } as never
    );

    const result = await updateStudentAvatarForManager(
      adminClient,
      "manager-1",
      actor,
      "teacher-1",
      photo()
    );

    expect(result).toEqual({ success: false, error: "Student not found." });
    expect(optimizeAvatarForStorage).not.toHaveBeenCalled();
  });

  it("uploads, points the profile at the new file, then removes the old one", async () => {
    const result = await updateStudentAvatarForManager(
      adminClient,
      "manager-1",
      actor,
      "student-1",
      photo()
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.avatar_url).toMatch(
      new RegExp(`^${STORAGE_BASE}/student-1/[0-9a-f-]{36}\\.webp$`)
    );
    expect(profileRepository.updateProfileAvatarUrl).toHaveBeenCalledWith(
      adminClient,
      "student-1",
      result.avatar_url
    );
    expect(avatarStorageRepository.removeAvatars).toHaveBeenCalledWith(
      adminClient,
      ["student-1/old.webp"]
    );
    expect(recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({ table_name: "profiles", record_id: "student-1" })
    );
  });

  it("returns the optimizer error without uploading", async () => {
    vi.mocked(optimizeAvatarForStorage).mockResolvedValue({
      ok: false,
      error: "Upload a JPEG, PNG, or WebP image.",
    });

    const result = await updateOwnAvatar(
      adminClient,
      "student-1",
      actor,
      photo()
    );

    expect(result).toEqual({
      success: false,
      error: "Upload a JPEG, PNG, or WebP image.",
    });
    expect(avatarStorageRepository.uploadAvatar).not.toHaveBeenCalled();
  });

  it("fails cleanly when the upload fails", async () => {
    vi.mocked(avatarStorageRepository.uploadAvatar).mockResolvedValue({
      error: { message: "storage down" },
    });

    const result = await updateOwnAvatar(
      adminClient,
      "student-1",
      actor,
      photo()
    );

    expect(result.success).toBe(false);
    expect(profileRepository.updateProfileAvatarUrl).not.toHaveBeenCalled();
    expect(avatarStorageRepository.removeAvatars).not.toHaveBeenCalled();
  });

  it("removes the new object and keeps the old one when the DB update fails", async () => {
    vi.mocked(profileRepository.updateProfileAvatarUrl).mockResolvedValue({
      data: null,
      error: { message: "db error" },
    } as never);

    const result = await updateOwnAvatar(
      adminClient,
      "student-1",
      actor,
      photo()
    );

    expect(result.success).toBe(false);
    expect(avatarStorageRepository.removeAvatars).toHaveBeenCalledTimes(1);
    const [, removedPaths] = vi.mocked(avatarStorageRepository.removeAvatars)
      .mock.calls[0];
    expect(removedPaths[0]).not.toBe("student-1/old.webp");
    expect(recordManagerAuditLog).not.toHaveBeenCalled();
  });

  it("uses the session user as the target for self uploads", async () => {
    await updateOwnAvatar(adminClient, "student-1", actor, photo());

    expect(
      studentProfileRepository.findStudentProfileByUserId
    ).toHaveBeenCalledWith(adminClient, "student-1");
  });

  it("clears the column and deletes the file on remove", async () => {
    const result = await removeStudentAvatarForManager(
      adminClient,
      "manager-1",
      actor,
      "student-1"
    );

    expect(result).toEqual({
      success: true,
      message: "Photo removed.",
      avatar_url: null,
    });
    expect(profileRepository.updateProfileAvatarUrl).toHaveBeenCalledWith(
      adminClient,
      "student-1",
      null
    );
    expect(avatarStorageRepository.removeAvatars).toHaveBeenCalledWith(
      adminClient,
      ["student-1/old.webp"]
    );
  });

  it("treats removing a missing photo as a no-op success", async () => {
    vi.mocked(profileRepository.findProfileAvatarUrlById).mockResolvedValue({
      data: { id: "student-1", avatar_url: null },
      error: null,
    } as never);

    const result = await removeOwnAvatar(adminClient, "student-1", actor);

    expect(result.success).toBe(true);
    expect(profileRepository.updateProfileAvatarUrl).not.toHaveBeenCalled();
    expect(recordManagerAuditLog).not.toHaveBeenCalled();
  });
});
