"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { changePasswordSchema } from "@/lib/validators/auth/auth";
import { emailField } from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as appSettingsRepository from "@/repositories/app-settings.repository";
import * as authRepository from "@/repositories/auth.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
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

function mapUpdateUserError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("reauth") ||
    normalized.includes("re-auth") ||
    normalized.includes("re-authentication")
  ) {
    return "Please sign in again before updating your credentials.";
  }

  if (normalized.includes("email") && normalized.includes("already")) {
    return "That email is already in use.";
  }

  return "Unable to update your credentials. Please try again.";
}

export async function updateMaintenanceModeAction(
  _prevState: UpdateMaintenanceModeActionState,
  formData: FormData
): Promise<UpdateMaintenanceModeActionState> {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();
  const unauthorized = await getUnauthorizedError(
    adminClient,
    user?.id ?? null,
    PERMISSIONS.SETTINGS_MAINTENANCE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const raw = formData.get("maintenanceMode");
  const enabled = raw === "true" || raw === "1";

  try {
    await appSettingsRepository.setMaintenanceMode(adminClient, enabled);

    return {
      success: true,
      message: enabled
        ? "Maintenance mode enabled."
        : "Maintenance mode disabled.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return { success: false, error: message };
  }
}

export async function updateSelfCredentialsAction(
  _prevState: ChangeSelfCredentialsActionState,
  formData: FormData
): Promise<ChangeSelfCredentialsActionState> {
  const user = await getSessionUser();
  const adminClient = createSupabaseAdminClient();
  const unauthorized = await getUnauthorizedError(
    adminClient,
    user?.id ?? null,
    PERMISSIONS.SETTINGS_UPDATE_CREDENTIALS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const rawNewEmail = formData.get("newEmail");
  const newEmail = typeof rawNewEmail === "string" ? rawNewEmail.trim() : "";

  const rawNewPassword = formData.get("newPassword");
  const newPassword =
    typeof rawNewPassword === "string" ? rawNewPassword : "";

  const rawConfirmPassword = formData.get("confirmPassword");
  const confirmPassword =
    typeof rawConfirmPassword === "string" ? rawConfirmPassword : "";

  const wantsEmail = Boolean(newEmail);
  const wantsPassword = Boolean(newPassword || confirmPassword);

  if (!wantsEmail && !wantsPassword) {
    return { success: false, error: "Enter either a new email or a new password." };
  }

  const fieldErrors: FieldErrors = {};

  if (wantsEmail) {
    const parsedEmail = emailField.safeParse(newEmail.toLowerCase());
    if (!parsedEmail.success) {
      fieldErrors.newEmail = [
        parsedEmail.error.issues[0]?.message ?? "Invalid email.",
      ];
    }
  }

  if (wantsPassword) {
    const parsedPassword = changePasswordSchema.safeParse({
      newPassword,
      confirmPassword,
    });

    if (!parsedPassword.success) {
      const passwordFieldErrors = zodFieldErrors(
        parsedPassword.error.flatten().fieldErrors
      );
      Object.assign(fieldErrors, passwordFieldErrors);
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const updateInput: { email?: string; password?: string } = {};
  if (wantsEmail) updateInput.email = newEmail.toLowerCase();
  if (wantsPassword) updateInput.password = newPassword;

  const client = await createSupabaseServerActionClient();
  const { error } = await authRepository.updateAuthUserEmailAndPassword(
    client,
    updateInput
  );

  if (error) {
    const message = (error as { message?: string }).message ?? "Update failed.";
    return { success: false, error: mapUpdateUserError(message) };
  }

  const message =
    wantsEmail && wantsPassword
      ? "Email and password updated."
      : wantsEmail
        ? "Email updated."
        : "Password updated.";

  return { success: true, message };
}
