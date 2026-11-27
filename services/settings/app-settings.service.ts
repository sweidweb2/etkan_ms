import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validators/auth/auth";
import { emailField } from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as appSettingsRepository from "@/repositories/app-settings.repository";
import * as authRepository from "@/repositories/auth.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";

export type UpdateSelfCredentialsResult =
  | { success: true; message: string }
  | { success?: false; error?: string; fieldErrors?: FieldErrors };

export type SetMaintenanceModeResult =
  | { success: true; message: string }
  | { success: false; error: string };

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

export async function getMaintenanceModeForManager(
  actorUserId: string | null
): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.SETTINGS_VIEW
  );
  return appSettingsRepository.getMaintenanceMode(adminClient);
}

export async function setMaintenanceModeForManager(
  actorUserId: string | null,
  actor: AuditActor,
  enabled: boolean
): Promise<SetMaintenanceModeResult> {
  const adminClient = createSupabaseAdminClient();
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SETTINGS_MAINTENANCE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  try {
    await appSettingsRepository.setMaintenanceMode(adminClient, enabled);

    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "critical",
      table_name: "app_settings",
      metadata: {
        note: enabled
          ? "Maintenance mode enabled."
          : "Maintenance mode disabled.",
        maintenance_mode: enabled,
      },
    });

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

export async function updateSelfCredentialsForManager(
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    newEmail: string;
    newPassword: string;
    confirmPassword: string;
  }
): Promise<UpdateSelfCredentialsResult> {
  const adminClient = createSupabaseAdminClient();
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SETTINGS_UPDATE_CREDENTIALS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const newEmail = input.newEmail.trim();
  const { newPassword, confirmPassword } = input;

  const wantsEmail = Boolean(newEmail);
  const wantsPassword = Boolean(newPassword || confirmPassword);

  if (!wantsEmail && !wantsPassword) {
    return {
      success: false,
      error: "Enter either a new email or a new password.",
    };
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

  const sessionClient = await createSupabaseServerActionClient();
  const { error } = await authRepository.updateAuthUserEmailAndPassword(
    sessionClient,
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

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "critical",
    table_name: "auth.users",
    record_id: actorUserId,
    metadata: {
      note: message,
      email_changed: wantsEmail,
      password_changed: wantsPassword,
    },
  });

  return { success: true, message };
}
