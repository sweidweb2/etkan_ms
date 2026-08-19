import { ManageGuestsPanel } from "@/components/manager/guests/manage-guests-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listGuestsForManager } from "@/services/guest.service";

export default async function ManagerGuestsPage() {
  const adminClient = createSupabaseAdminClient();
  const timer = createNavStepTimer("guests_list");
  const user = await timer.step("session", () => getSessionUser());
  const guests = await timer.step("guests", () =>
    listGuestsForManager(adminClient, user?.id ?? null)
  );
  timer.end();

  return <ManageGuestsPanel initialGuests={guests} />;
}
