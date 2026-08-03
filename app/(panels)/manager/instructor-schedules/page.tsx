import { redirect } from "next/navigation";
import { InstructorSchedulesPanel } from "@/components/manager/instructor-schedules/instructor-schedules-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInstructorSchedulesPageForManager } from "@/services/instructor-schedule-slot.service";

export default async function ManagerInstructorSchedulesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const data = await getInstructorSchedulesPageForManager(
    adminClient,
    user.id
  );

  return <InstructorSchedulesPanel data={data} />;
}
