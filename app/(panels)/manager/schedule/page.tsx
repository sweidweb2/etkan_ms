import { ManagerSchedulePanel } from "@/components/manager/schedule/manager-schedule-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listWeeklyScheduleSlotsForManager } from "@/services/weekly-schedule-slot.service";

export default async function ManagerSchedulePage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const sessions = await listWeeklyScheduleSlotsForManager(
    adminClient,
    user?.id ?? null
  );

  return <ManagerSchedulePanel initialSessions={sessions} />;
}
