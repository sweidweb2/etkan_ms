import { ManagerSchedulePanel } from "@/components/manager/schedule/manager-schedule-panel";
import { getSessionUser } from "@/lib/auth/session";
import {
  formatDateFromDate,
  getSundayWeekBounds,
} from "@/lib/manager/weekly-schedule-calendar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listWeeklyScheduleSlotsForManager } from "@/services/schedule/weekly-schedule-slot.service";

export default async function ManagerSchedulePage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const { weekStart } = getSundayWeekBounds(formatDateFromDate(new Date()));
  const sessions = await listWeeklyScheduleSlotsForManager(
    adminClient,
    user?.id ?? null,
    { weekStart }
  );

  return <ManagerSchedulePanel initialSessions={sessions} />;
}
