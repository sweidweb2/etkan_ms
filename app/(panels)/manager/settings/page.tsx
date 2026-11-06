import { Suspense } from "react";
import { CronJobsSettingsSection } from "@/components/manager/settings/cron-jobs-settings-section";
import { MaintenanceModeSection } from "@/components/manager/settings/maintenance-mode-section";
import { ResetPasswordsByRoleSection } from "@/components/manager/settings/reset-passwords-by-role-section";
import {
  ResetUserPasswordSectionDeferred,
  ResetUserPasswordSectionFallback,
} from "@/components/manager/settings/reset-user-password-section-deferred";
import { SelfCredentialsSection } from "@/components/manager/settings/self-credentials-section";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { getSessionUser } from "@/lib/auth/session";
import {
  navPageTimingBeacon,
  startNavPageTimer,
} from "@/lib/debug/start-nav-page-timer";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getMaintenanceMode } from "@/repositories/app-settings.repository";

export default async function ManagerSettingsPage() {
  const pageTimer = await startNavPageTimer("manager/settings");

  const [client, sessionUser] = await Promise.all([
    createSupabaseServerComponentClient(),
    getSessionUser(),
  ]);

  const maintenanceMode = await getMaintenanceMode(client);

  pageTimer.end();

  return (
    <>
      {await navPageTimingBeacon()}
      <div className="flex flex-col gap-4">
        <PanelPageHeader title="Settings" />
        <div className="grid items-start gap-4 @2xl/panel:grid-cols-2">
          <div className="flex flex-col gap-4">
            <MaintenanceModeSection initialEnabled={maintenanceMode} />
            <CronJobsSettingsSection />
          </div>
          <SelfCredentialsSection />
        </div>
        <div className="grid items-start gap-4 @2xl/panel:grid-cols-2">
          <ResetPasswordsByRoleSection />
          <Suspense fallback={<ResetUserPasswordSectionFallback />}>
            <ResetUserPasswordSectionDeferred
              actorUserId={sessionUser?.id ?? null}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
