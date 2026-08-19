import { ManageClassesPanel } from "@/components/manager/classes/manage-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listClassesForManager } from "@/services/classes/class.service";

export default async function ManagerClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const classes = await listClassesForManager(adminClient, actorUserId);

  return <ManageClassesPanel initialClasses={classes} />;
}
