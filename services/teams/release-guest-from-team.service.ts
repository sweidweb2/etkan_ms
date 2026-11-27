import "server-only";

import { GUEST_CURRENT_STATUSES } from "@/lib/constants/guest";
import * as teamRepository from "@/repositories/team.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Closed profile statuses. Guests may still be assigned to teams intentionally,
 * but an open→closed transition auto-releases them from any team.
 */
const CLOSED_GUEST_STATUSES: readonly string[] = [
  GUEST_CURRENT_STATUSES.CANCELLED,
  GUEST_CURRENT_STATUSES.REJECTED,
  GUEST_CURRENT_STATUSES.FINISHED,
];

export function isClosedGuestStatus(status: string): boolean {
  return CLOSED_GUEST_STATUSES.includes(status);
}

/**
 * When a guest moves from an open profile status into a closed one, remove them
 * from their team (if any). No-op for closed→*, *→open, or guests not on a team.
 *
 * Kept outside `team.service` so `guest.service` can call it without a
 * guest.service ↔ team.service import cycle.
 */
export async function releaseGuestFromTeamIfBecameClosed(
  adminClient: Supabase,
  actor: AuditActor,
  input: {
    guestId: string;
    previousStatus: string;
    nextStatus: string;
    guestName?: string;
  }
): Promise<void> {
  const { guestId, previousStatus, nextStatus, guestName } = input;

  if (
    isClosedGuestStatus(previousStatus) ||
    !isClosedGuestStatus(nextStatus)
  ) {
    return;
  }

  const membership = await teamRepository.findTeamGuestByGuestId(
    adminClient,
    guestId
  );
  if (membership.error || !membership.data) {
    return;
  }

  const { error } = await teamRepository.removeGuestFromTeam(
    adminClient,
    guestId
  );
  if (error) {
    return;
  }

  const label = guestName?.trim() || "Guest";
  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "info",
    table_name: "team_guests",
    record_id: guestId,
    old_data: {
      guest_id: guestId,
      team_id: membership.data.team_id,
    },
    metadata: {
      note: `${label} released from team after profile became ${nextStatus}.`,
    },
  });
}
