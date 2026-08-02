import { redirect } from "next/navigation";
import { ManageInstructorsPanel } from "@/components/manager/instructors/manage-instructors-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInstructorsPageForManager } from "@/services/instructor.service";

export default async function ManagerInstructorsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const data = await getInstructorsPageForManager(adminClient, user.id);

  return <ManageInstructorsPanel data={data} />;
}
