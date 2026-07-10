import { ManagerSchedulePanel } from "@/components/manager/schedule/manager-schedule-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listWeeklyScheduleClassOptionsForManager,
  listWeeklyScheduleSlotsForManager,
} from "@/services/weekly-schedule-slot.service";

export default async function ManagerSchedulePage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const [sessions, classOptions] = await Promise.all([
    listWeeklyScheduleSlotsForManager(adminClient, role),
    listWeeklyScheduleClassOptionsForManager(adminClient, role),
  ]);

  return (
    <ManagerSchedulePanel
      initialSessions={sessions}
      classOptions={classOptions}
    />
  );
}
