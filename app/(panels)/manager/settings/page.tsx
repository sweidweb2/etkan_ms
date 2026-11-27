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
import { getMaintenanceModeForManager } from "@/services/settings/app-settings.service";

export default async function ManagerSettingsPage() {
  const pageTimer = await startNavPageTimer("manager/settings");

  const sessionUser = await getSessionUser();
  const maintenanceMode = await getMaintenanceModeForManager(
    sessionUser?.id ?? null
  );

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
