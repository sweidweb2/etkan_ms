import { CronJobsSettingsSection } from "@/components/manager/settings/cron-jobs-settings-section";
import { MaintenanceModeSection } from "@/components/manager/settings/maintenance-mode-section";
import { ResetPasswordsByRoleSection } from "@/components/manager/settings/reset-passwords-by-role-section";
import { ResetUserPasswordSection } from "@/components/manager/settings/reset-user-password-section";
import { SelfCredentialsSection } from "@/components/manager/settings/self-credentials-section";
import { getSessionUser } from "@/lib/auth/session";
import {
  navPageTimingBeacon,
  startNavPageTimer,
} from "@/lib/debug/start-nav-page-timer";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getMaintenanceMode } from "@/repositories/app-settings.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { listPasswordResetUserOptions } from "@/services/auth/password-reset.service";
import type { PasswordResetUserOption } from "@/types/password-reset";

export default async function ManagerSettingsPage() {
  const pageTimer = await startNavPageTimer("manager/settings");
  const client = await createSupabaseServerComponentClient();
  const adminClient = createSupabaseAdminClient();
  const sessionUser = await getSessionUser();
  const maintenanceMode = await getMaintenanceMode(client);

  let passwordResetUsers: PasswordResetUserOption[] = [];
  const resetUnauthorized = await getUnauthorizedError(
    adminClient,
    sessionUser?.id ?? null,
    PERMISSIONS.SETTINGS_RESET_PASSWORDS
  );
  if (!resetUnauthorized) {
    passwordResetUsers = await listPasswordResetUserOptions(
      adminClient,
      sessionUser?.id ?? null
    );
  }

  pageTimer.end();

  return (
    <>
      {await navPageTimingBeacon()}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <MaintenanceModeSection initialEnabled={maintenanceMode} />
            <CronJobsSettingsSection />
          </div>
          <SelfCredentialsSection />
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ResetPasswordsByRoleSection />
          <ResetUserPasswordSection users={passwordResetUsers} />
        </div>
      </div>
    </>
  );
}
