import { redirect } from "next/navigation";
import { ManageInstructorsPanel } from "@/components/manager/instructors/manage-instructors-panel";
import { getSessionPack } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInstructorsPageForManager } from "@/services/instructor.service";

export default async function ManagerInstructorsPage() {
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();

  if (!pack.user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const data = await getInstructorsPageForManager(adminClient, pack.user.id);

  return <ManageInstructorsPanel data={data} />;
}
