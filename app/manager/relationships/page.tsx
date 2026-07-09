import { ManageRelationshipsPanel } from "@/components/manager/relationships/manage-relationships-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listRelationshipsForManager } from "@/services/relationship.service";

export default async function ManagerRelationshipsPage() {
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const relationships = await listRelationshipsForManager(adminClient, role);

  return <ManageRelationshipsPanel initialRelationships={relationships} />;
}
