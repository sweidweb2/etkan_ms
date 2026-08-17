import { ManageGuestsPanel } from "@/components/manager/guests/manage-guests-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listGuestsForManager } from "@/services/guest.service";

export default async function ManagerGuestsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const guests = await listGuestsForManager(adminClient, user?.id ?? null);

  return <ManageGuestsPanel initialGuests={guests} />;
}
