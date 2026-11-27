import { ManageGuestsPanel } from "@/components/manager/guests/manage-guests-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { logOpsWarn } from "@/lib/ops/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listGuestsPageForManager } from "@/services/guests/guest.service";
import { listTeamsForManager } from "@/services/teams/team.service";

export default async function ManagerGuestsPage() {
  const adminClient = createSupabaseAdminClient();
  const timer = createNavStepTimer("guests_list");
  const user = await timer.step("session", () => getSessionUser());
  const actorUserId = user?.id ?? null;

  const [guestsData, teams] = await Promise.all([
    timer.step("guests", () =>
      listGuestsPageForManager(adminClient, actorUserId, {
        page: 1,
        unassignedOnly: true,
      })
    ),
    // Team memberships load only assigned guest rows (not the full roster).
    timer.step("teams", () =>
      listTeamsForManager(adminClient, actorUserId).catch((error) => {
        logOpsWarn("manager/guests", "Teams list failed; rendering empty", {
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      })
    ),
  ]);
  timer.end();

  return (
    <ManageGuestsPanel initialData={guestsData} initialTeams={teams} />
  );
}
