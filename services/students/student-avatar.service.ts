import "server-only";

import { setCachedSessionShellAvatar } from "@/lib/auth/session-shell-cache";
import { optimizeAvatarForStorage } from "@/lib/avatars/optimize-avatar";
import {
  buildAvatarObjectPath,
  getAvatarObjectPathFromPublicUrl,
} from "@/lib/avatars/storage-path";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import * as avatarStorageRepository from "@/repositories/avatar-storage.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type StudentAvatarResult =
  | { success: true; message: string; avatar_url: string | null }
  | { success: false; error: string };

const UPLOAD_FAILED = "Unable to upload photo. Please try again.";
const REMOVE_FAILED = "Unable to remove photo. Please try again.";

async function resolveStudentTarget(
  adminClient: Supabase,
  actorUserId: string | null,
  permission: PermissionKey,
  studentUserId: string | null
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    permission
  );
  if (unauthorized) {
    return { ok: false, error: unauthorized };
  }

  const userId = studentUserId?.trim();
  if (!userId) {
    return { ok: false, error: "Student not found." };
  }

  const { data, error } =
    await studentProfileRepository.findStudentProfileByUserId(
      adminClient,
      userId
    );
  if (error) {
    return { ok: false, error: "Unable to load student. Please try again." };
  }
  if (!data) {
    return { ok: false, error: "Student not found." };
  }

  return { ok: true, userId };
}

async function removeStoredAvatar(
  adminClient: Supabase,
  avatarUrl: string | null
): Promise<void> {
  if (!avatarUrl) {
    return;
  }
  const objectPath = getAvatarObjectPathFromPublicUrl(avatarUrl);
  if (!objectPath) {
    return;
  }
  const { error } = await avatarStorageRepository.removeAvatars(adminClient, [
    objectPath,
  ]);
  if (error) {
    console.error("[avatar] failed to remove previous object", {
      objectPath,
      error: error.message,
    });
  }
}

/**
 * Upload (bytes) or clear (null) a profile avatar.
 * New object first, then the column, then the old object, so a failure
 * never leaves the profile pointing at a missing file.
 */
async function replaceProfileAvatar(
  adminClient: Supabase,
  actor: AuditActor,
  userId: string,
  bytes: Buffer | null
): Promise<StudentAvatarResult> {
  const failure = bytes ? UPLOAD_FAILED : REMOVE_FAILED;

  const current = await profileRepository.findProfileAvatarUrlById(
    adminClient,
    userId
  );
  if (current.error) {
    return { success: false, error: failure };
  }
  if (!current.data) {
    return { success: false, error: "Student not found." };
  }
  const previousUrl = current.data.avatar_url;

  if (!bytes && !previousUrl) {
    return { success: true, message: "Photo removed.", avatar_url: null };
  }

  let nextUrl: string | null = null;
  let newObjectPath: string | null = null;

  if (bytes) {
    newObjectPath = buildAvatarObjectPath(userId);
    const uploaded = await avatarStorageRepository.uploadAvatar(
      adminClient,
      newObjectPath,
      bytes
    );
    if (uploaded.error) {
      return { success: false, error: UPLOAD_FAILED };
    }
    nextUrl = avatarStorageRepository.getAvatarPublicUrl(
      adminClient,
      newObjectPath
    );
    if (!nextUrl) {
      await avatarStorageRepository.removeAvatars(adminClient, [newObjectPath]);
      return { success: false, error: UPLOAD_FAILED };
    }
  }

  const updated = await profileRepository.updateProfileAvatarUrl(
    adminClient,
    userId,
    nextUrl
  );
  if (updated.error || !updated.data) {
    if (newObjectPath) {
      await avatarStorageRepository.removeAvatars(adminClient, [newObjectPath]);
    }
    return { success: false, error: failure };
  }

  setCachedSessionShellAvatar(userId, nextUrl);
  await removeStoredAvatar(adminClient, previousUrl);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "profiles",
    record_id: userId,
    old_data: { avatar_url: previousUrl },
    new_data: { avatar_url: nextUrl },
    metadata: {
      note: bytes ? "Profile photo updated." : "Profile photo removed.",
      changed_fields: ["avatar_url"],
    },
  });

  return {
    success: true,
    message: bytes ? "Photo updated." : "Photo removed.",
    avatar_url: nextUrl,
  };
}

async function uploadAvatarForTarget(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  permission: PermissionKey,
  studentUserId: string | null,
  file: File | null
): Promise<StudentAvatarResult> {
  const target = await resolveStudentTarget(
    adminClient,
    actorUserId,
    permission,
    studentUserId
  );
  if (!target.ok) {
    return { success: false, error: target.error };
  }

  if (!file) {
    return { success: false, error: "Please choose an image file." };
  }

  const optimized = await optimizeAvatarForStorage(file);
  if (!optimized.ok) {
    return { success: false, error: optimized.error };
  }

  return replaceProfileAvatar(adminClient, actor, target.userId, optimized.bytes);
}

async function removeAvatarForTarget(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  permission: PermissionKey,
  studentUserId: string | null
): Promise<StudentAvatarResult> {
  const target = await resolveStudentTarget(
    adminClient,
    actorUserId,
    permission,
    studentUserId
  );
  if (!target.ok) {
    return { success: false, error: target.error };
  }

  return replaceProfileAvatar(adminClient, actor, target.userId, null);
}

export async function updateOwnAvatar(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  file: File | null
): Promise<StudentAvatarResult> {
  return uploadAvatarForTarget(
    adminClient,
    actorUserId,
    actor,
    PERMISSIONS.STUDENTS_UPDATE_OWN_AVATAR,
    actorUserId,
    file
  );
}

export async function removeOwnAvatar(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor
): Promise<StudentAvatarResult> {
  return removeAvatarForTarget(
    adminClient,
    actorUserId,
    actor,
    PERMISSIONS.STUDENTS_UPDATE_OWN_AVATAR,
    actorUserId
  );
}

export async function updateStudentAvatarForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  studentUserId: string,
  file: File | null
): Promise<StudentAvatarResult> {
  return uploadAvatarForTarget(
    adminClient,
    actorUserId,
    actor,
    PERMISSIONS.STUDENTS_UPDATE_AVATAR,
    studentUserId,
    file
  );
}

export async function removeStudentAvatarForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  studentUserId: string
): Promise<StudentAvatarResult> {
  return removeAvatarForTarget(
    adminClient,
    actorUserId,
    actor,
    PERMISSIONS.STUDENTS_UPDATE_AVATAR,
    studentUserId
  );
}
