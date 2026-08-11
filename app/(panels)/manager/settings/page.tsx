import { CronJobsSettingsSection } from "@/components/manager/settings/cron-jobs-settings-section";
import { MaintenanceModeSection } from "@/components/manager/settings/maintenance-mode-section";
import { SelfCredentialsSection } from "@/components/manager/settings/self-credentials-section";
import {
  navPageTimingBeacon,
  startNavPageTimer,
} from "@/lib/debug/start-nav-page-timer";
import { getMaintenanceMode } from "@/repositories/app-settings.repository";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export default async function ManagerSettingsPage() {
  const pageTimer = await startNavPageTimer("manager/settings");
  const client = await createSupabaseServerComponentClient();
  const maintenanceMode = await getMaintenanceMode(client);
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
      </div>
    </>
  );
}
