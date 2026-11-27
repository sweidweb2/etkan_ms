"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/session";
import {
  resetPasswordsByRoleForManager,
  resetUserPasswordForManager,
} from "@/services/auth/password-reset.service";
import {
  setMaintenanceModeForManager,
  updateSelfCredentialsForManager,
} from "@/services/settings/app-settings.service";
import type { FieldErrors } from "@/types/auth";

export type UpdateMaintenanceModeActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type ChangeSelfCredentialsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type ResetPasswordsByRoleActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  /** One-shot XLSX payload; plaintext passwords are not kept as structured rows. */
  downloadBase64?: string;
  downloadFilename?: string;
  role?: string;
};

export type ResetUserPasswordActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export async function updateMaintenanceModeAction(
  _prevState: UpdateMaintenanceModeActionState,
  formData: FormData
): Promise<UpdateMaintenanceModeActionState> {
  const user = await getSessionUser();
  const raw = formData.get("maintenanceMode");
  const enabled = raw === "true" || raw === "1";

  return setMaintenanceModeForManager(user?.id ?? null, enabled);
}

export async function updateSelfCredentialsAction(
  _prevState: ChangeSelfCredentialsActionState,
  formData: FormData
): Promise<ChangeSelfCredentialsActionState> {
  const user = await getSessionUser();

  const rawNewEmail = formData.get("newEmail");
  const newEmail = typeof rawNewEmail === "string" ? rawNewEmail : "";

  const rawNewPassword = formData.get("newPassword");
  const newPassword =
    typeof rawNewPassword === "string" ? rawNewPassword : "";

  const rawConfirmPassword = formData.get("confirmPassword");
  const confirmPassword =
    typeof rawConfirmPassword === "string" ? rawConfirmPassword : "";

  return updateSelfCredentialsForManager(user?.id ?? null, {
    newEmail,
    newPassword,
    confirmPassword,
  });
}

export async function resetPasswordsByRoleAction(
  _prevState: ResetPasswordsByRoleActionState,
  formData: FormData
): Promise<ResetPasswordsByRoleActionState> {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();

  const rawRole = formData.get("role");
  const role = typeof rawRole === "string" ? rawRole.trim() : "";

  const result = await resetPasswordsByRoleForManager(
    adminClient,
    user?.id ?? null,
    { role }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  const { buildPasswordResetXlsxBlob, passwordResetXlsxFilename } =
    await import("@/lib/export/password-reset-xlsx");
  const blob = await buildPasswordResetXlsxBlob(result.rows);
  const buffer = Buffer.from(await blob.arrayBuffer());

  return {
    success: true,
    message: result.message,
    downloadBase64: buffer.toString("base64"),
    downloadFilename: passwordResetXlsxFilename(role || "users"),
    role,
  };
}

export async function resetUserPasswordAction(
  _prevState: ResetUserPasswordActionState,
  formData: FormData
): Promise<ResetUserPasswordActionState> {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();

  const rawUserId = formData.get("userId");
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";

  const rawPassword = formData.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";

  const result = await resetUserPasswordForManager(
    adminClient,
    user?.id ?? null,
    { userId, password }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
  };
}
