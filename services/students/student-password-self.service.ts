import { PERMISSIONS } from "@/lib/constants/permissions";
import * as authRepository from "@/repositories/auth.repository";
import {
  assertStudentSelfAccess,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import { changeOwnPasswordSchema } from "@/lib/validators/student/change-own-password";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type ChangeOwnPasswordResult =
  | { success: true; message: string }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export async function changeOwnStudentPassword(
  adminClient: Supabase,
  sessionClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<ChangeOwnPasswordResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.STUDENTS_UPDATE_OWN
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = changeOwnPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const userId = await assertStudentSelfAccess(adminClient, actorUserId);
  const authUser = await authRepository.getAuthUserById(adminClient, userId);
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
    record_id: userId,
    old_data: {},
    new_data: { password_changed: true },
  });

  return { success: true, message: "Password updated." };
}
