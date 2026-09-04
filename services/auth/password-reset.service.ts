import "server-only";

import { isPasswordResetByRoleValue } from "@/lib/constants/password-reset-roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import { generateStrongPassword } from "@/lib/utils/generate-strong-password";
import {
  resetPasswordsByRoleSchema,
  resetUserPasswordSchema,
} from "@/lib/validators/manager/password-reset";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import type {
  PasswordResetExportRow,
  PasswordResetFailureResult,
  PasswordResetUserOption,
} from "@/types/password-reset";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type ResetByRoleSuccess = {
  success: true;
  message: string;
  rows: PasswordResetExportRow[];
};

type ResetUserSuccess = {
  success: true;
  message: string;
};

function uniqueStrongPassword(used: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const password = generateStrongPassword();
    if (!used.has(password)) {
      used.add(password);
      return password;
    }
  }

  const fallback = `${generateStrongPassword()}${Date.now().toString(36)}`;
  used.add(fallback);
  return fallback;
}

export async function listPasswordResetUserOptions(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<PasswordResetUserOption[]> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SETTINGS_RESET_PASSWORDS
  );
  if (unauthorized) {
    throw new Error(unauthorized);
  }

  const { data: profiles, error } =
    await profileRepository.listProfiles(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  const rows = profiles ?? [];
  const { data: emailById, error: emailError } =
    await authRepository.listAuthEmailsByIds(
      adminClient,
      rows.map((profile) => profile.id)
    );

  if (emailError) {
    throw new Error(emailError.message);
  }

  return rows
    .map((profile) => ({
      id: profile.id,
      username: profile.username?.trim() || profile.id,
      email: emailById.get(profile.id) ?? "",
      role: profile.role as RoleValue,
    }))
    .sort((a, b) =>
      a.username.localeCompare(b.username, undefined, { sensitivity: "base" })
    );
}

export async function resetPasswordsByRoleForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { role: string }
): Promise<ResetByRoleSuccess | PasswordResetFailureResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SETTINGS_RESET_PASSWORDS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = resetPasswordsByRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const role = parsed.data.role;
  if (!isPasswordResetByRoleValue(role)) {
    return { success: false, error: "That role cannot be bulk password-reset." };
  }

  const { data: profiles, error } = await profileRepository.listProfiles(
    adminClient,
    { roles: [role] }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const targets = profiles ?? [];
  if (targets.length === 0) {
    return {
      success: false,
      error: `No users found with the ${role} role.`,
    };
  }

  const { data: emailById, error: emailError } =
    await authRepository.listAuthEmailsByIds(
      adminClient,
      targets.map((profile) => profile.id)
    );

  if (emailError) {
    return { success: false, error: emailError.message };
  }

  const usedPasswords = new Set<string>();
  const exportRows: PasswordResetExportRow[] = [];
  let failureCount = 0;

  for (const profile of targets) {
    const password = uniqueStrongPassword(usedPasswords);
    const { error: updateError } =
      await authRepository.updateAuthUserPasswordByAdmin(
        adminClient,
        profile.id,
        password
      );

    if (updateError) {
      failureCount += 1;
      continue;
    }

    exportRows.push({
      username: profile.username?.trim() || profile.id,
      email: emailById.get(profile.id) ?? "",
      role: profile.role,
      password,
    });
  }

  if (exportRows.length === 0) {
    return {
      success: false,
      error: "Unable to reset passwords. Please try again.",
    };
  }

  const message =
    failureCount > 0
      ? `Reset ${exportRows.length} of ${targets.length} ${role} password(s). Excel is downloading.`
      : `Reset ${exportRows.length} ${role} password(s). Excel is downloading.`;

  return { success: true, message, rows: exportRows };
}

export async function resetUserPasswordForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: { userId: string; password: string }
): Promise<ResetUserSuccess | PasswordResetFailureResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SETTINGS_RESET_PASSWORDS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = resetUserPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId, password } = parsed.data;

  const { data: profile, error: profileError } =
    await profileRepository.findProfileById(adminClient, userId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  if (!profile) {
    return { success: false, error: "User not found." };
  }

  const { error: updateError } =
    await authRepository.updateAuthUserPasswordByAdmin(
      adminClient,
      userId,
      password
    );

  if (updateError) {
    return {
      success: false,
      error: updateError.message || "Unable to reset password. Please try again.",
    };
  }

  const label = profile.username?.trim() || "user";
  return {
    success: true,
    message: `Password updated for ${label}.`,
  };
}
