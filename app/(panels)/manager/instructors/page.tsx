import { redirect } from "next/navigation";
import { ManageInstructorsPanel } from "@/components/manager/instructors/manage-instructors-panel";
import { getSessionPack } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInstructorsPageForManager } from "@/services/instructors/instructor.service";
import { getMentorsForManager } from "@/services/mentors/mentor.service";
import type { ManagerMentorRow } from "@/types/manager-mentor";

export default async function ManagerInstructorsPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();

  if (!pack.user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const userId = pack.user.id;
  const [data, mentors] = await Promise.all([
    getInstructorsPageForManager(adminClient, userId),
    getMentorsForManager(adminClient, userId).catch(
      (): ManagerMentorRow[] => []
    ),
  ]);

  return <ManageInstructorsPanel data={data} mentors={mentors} />;
}
