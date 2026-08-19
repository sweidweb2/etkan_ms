import { ManageRelationshipsPanel } from "@/components/manager/relationships/manage-relationships-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listRelationshipsForManager } from "@/services/relationships/relationship.service";

export default async function ManagerRelationshipsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const relationships = await listRelationshipsForManager(adminClient, user?.id ?? null);

  return <ManageRelationshipsPanel initialRelationships={relationships} />;
}
