import "server-only";

import { ROLES } from "@/lib/constants/roles";
import { changeOwnPasswordSchema } from "@/lib/validators/auth/change-own-password";
import { updateOwnTeacherProfileSchema } from "@/lib/validators/teacher/update-own-profile";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type TeacherSelfProfile = {
  fullName: string;
  username: string;
  email: string;
};

export type UpdateOwnTeacherProfileResult =
  | { success: true; profile: TeacherSelfProfile; message: string }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export type ChangeOwnTeacherPasswordResult =
  | { success: true; message: string }
  | { success: false; error: string; fieldErrors?: FieldErrors };

async function assertTeacherSelf(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<
  | { ok: true; userId: string; username: string }
  | { ok: false; error: string }
> {
  if (!actorUserId) {
    return { ok: false, error: "You must be signed in." };
  }

  const profile = await profileRepository.findProfileById(
    adminClient,
    actorUserId
  );
  if (profile.error || !profile.data) {
    return { ok: false, error: "Profile not found." };
  }
  if (profile.data.role !== ROLES.TEACHER) {
    return { ok: false, error: "Only teachers can update this profile." };
  }

  return {
    ok: true,
    userId: actorUserId,
    username: profile.data.username ?? "",
  };
}

export async function getTeacherSelfProfile(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<TeacherSelfProfile | null> {
  const access = await assertTeacherSelf(adminClient, actorUserId);
  if (!access.ok) {
    return null;
  }

  const authUser = await authRepository.getAuthUserById(
    adminClient,
    access.userId
  );

  if (authUser.error || !authUser.data.user) {
    return null;
  }

  const fullName =
    typeof authUser.data.user.user_metadata?.full_name === "string"
      ? authUser.data.user.user_metadata.full_name.trim()
      : "";

  return {
    fullName,
    username: access.username,
    email: authUser.data.user.email ?? "",
  };
}

export async function updateOwnTeacherProfile(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdateOwnTeacherProfileResult> {
  const access = await assertTeacherSelf(adminClient, actorUserId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const parsed = updateOwnTeacherProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const fullName = parsed.data.fullName.trim();
  const username = parsed.data.username.trim();
  const email = parsed.data.email.trim().toLowerCase();

  const [existingProfile, existingAuth] = await Promise.all([
    profileRepository.findProfileById(adminClient, access.userId),
    authRepository.getAuthUserById(adminClient, access.userId),
  ]);

  if (
    existingProfile.error ||
    !existingProfile.data ||
    existingAuth.error ||
    !existingAuth.data.user
  ) {
    return { success: false, error: "Profile not found." };
  }

  const previousUsername = existingProfile.data.username ?? "";
  const previousEmail = existingAuth.data.user.email ?? "";
  const previousFullName =
    typeof existingAuth.data.user.user_metadata?.full_name === "string"
      ? existingAuth.data.user.user_metadata.full_name
      : "";

  if (username !== previousUsername) {
    const taken = await profileRepository.findProfileByUsername(
      adminClient,
      username
    );
    if (taken.error) {
      return {
        success: false,
        error: taken.error.message || "Unable to update profile.",
      };
    }
    if (taken.data && taken.data.id !== access.userId) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { username: ["This username is already taken."] },
      };
    }
  }

  if (username !== previousUsername) {
    const profileUpdate = await profileRepository.updateProfileById(
      adminClient,
      access.userId,
      { username }
    );
    if (profileUpdate.error || !profileUpdate.data) {
      return {
        success: false,
        error: profileUpdate.error?.message || "Unable to update username.",
      };
    }
  }

  const authUpdate = await authRepository.updateAuthUserByAdmin(
    adminClient,
    access.userId,
    {
      fullName,
      username,
      ...(email !== previousEmail ? { email } : {}),
    }
  );

  if (authUpdate.error) {
    if (username !== previousUsername) {
      await profileRepository.updateProfileById(adminClient, access.userId, {
        username: previousUsername,
      });
    }
    const message = authUpdate.error.message.toLowerCase();
    if (message.includes("email") && message.includes("already")) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { email: ["That email is already in use."] },
      };
    }
    return {
      success: false,
      error: authUpdate.error.message || "Unable to update profile.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "profiles",
    record_id: access.userId,
    old_data: {
      username: previousUsername,
      email: previousEmail,
      full_name: previousFullName,
    },
    new_data: { username, email, full_name: fullName },
  });

  return {
    success: true,
    message: "Profile updated.",
    profile: { fullName, username, email },
  };
}

export async function changeOwnTeacherPassword(
  adminClient: Supabase,
  sessionClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<ChangeOwnTeacherPasswordResult> {
  const access = await assertTeacherSelf(adminClient, actorUserId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const parsed = changeOwnPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const authUser = await authRepository.getAuthUserById(
    adminClient,
    access.userId
  );
  const email = authUser.data.user?.email;

  if (authUser.error || !email) {
    return { success: false, error: "Unable to change password." };
  }

  const verified = await authRepository.verifyPassword(
    email,
    parsed.data.currentPassword
  );

  if (!verified.ok) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { currentPassword: ["Old password is incorrect."] },
    };
  }

  const updated = await authRepository.updateAuthUserEmailAndPassword(
    sessionClient,
    { password: parsed.data.newPassword }
  );

  if (updated.error) {
    return {
      success: false,
      error: updated.error.message || "Unable to change password.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "auth.users",
    record_id: access.userId,
    old_data: {},
    new_data: { password_changed: true },
  });

  return { success: true, message: "Password updated." };
}
