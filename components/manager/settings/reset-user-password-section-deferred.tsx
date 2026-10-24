import { ResetUserPasswordSection } from "@/components/manager/settings/reset-user-password-section";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { listPasswordResetUserOptions } from "@/services/auth/password-reset.service";
import type { PasswordResetUserOption } from "@/types/password-reset";

type ResetUserPasswordSectionDeferredProps = {
  actorUserId: string | null;
};

export function ResetUserPasswordSectionFallback() {
  return (
    <div
      className="min-h-[16rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
      aria-hidden
    />
  );
}

/**
 * Streams the password-reset user list after the settings shell paints.
 * Authz is checked here so the shell no longer waits on the user list.
 */
export async function ResetUserPasswordSectionDeferred({
  actorUserId,
}: ResetUserPasswordSectionDeferredProps) {
  const adminClient = createSupabaseAdminClient();

  const resetUnauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SETTINGS_RESET_PASSWORDS
  );

  let passwordResetUsers: PasswordResetUserOption[] = [];
  if (!resetUnauthorized) {
    passwordResetUsers = await listPasswordResetUserOptions(
      adminClient,
      actorUserId
    );
  }

  return <ResetUserPasswordSection users={passwordResetUsers} />;
}
