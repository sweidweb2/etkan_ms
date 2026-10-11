import { ManageGuestsPanel } from "@/components/manager/guests/manage-guests-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listGuestsForManager } from "@/services/guests/guest.service";
import { listTeamsForManager } from "@/services/teams/team.service";

export default async function ManagerGuestsPage() {
  const adminClient = createSupabaseAdminClient();
  const timer = createNavStepTimer("guests_list");
  const user = await timer.step("session", () => getSessionUser());
  const actorUserId = user?.id ?? null;

  const guestsPromise = timer.step("guests", () =>
    listGuestsForManager(adminClient, actorUserId)
  );

  const [guests, teams] = await Promise.all([
    guestsPromise,
    // Roles without teams.view still get the guests table.
    // Pass the in-flight guest list so teams skip a second guests + email load.
    timer.step("teams", () =>
      listTeamsForManager(adminClient, actorUserId, guestsPromise).catch(
        () => []
      )
    ),
  ]);
  timer.end();

  return <ManageGuestsPanel initialGuests={guests} initialTeams={teams} />;
}
