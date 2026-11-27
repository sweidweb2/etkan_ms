import { ResetUserPasswordSection } from "@/components/manager/settings/reset-user-password-section";
import { loadPasswordResetUsersDeferredForManager } from "@/services/auth/password-reset.service";

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
 * Authz is checked in the service so the shell no longer waits on the user list.
 */
export async function ResetUserPasswordSectionDeferred({
  actorUserId,
}: ResetUserPasswordSectionDeferredProps) {
  const passwordResetUsers =
    await loadPasswordResetUsersDeferredForManager(actorUserId);

  return <ResetUserPasswordSection users={passwordResetUsers} />;
}
