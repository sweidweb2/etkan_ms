import "server-only";

import { GUEST_CURRENT_STATUSES } from "@/lib/constants/guest";
import { logOpsError } from "@/lib/ops/logger";
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
): Promise<{ released: boolean; error: string | null }> {
  const { guestId, previousStatus, nextStatus, guestName } = input;

  if (
    isClosedGuestStatus(previousStatus) ||
    !isClosedGuestStatus(nextStatus)
  ) {
    return { released: false, error: null };
  }

  const membership = await teamRepository.findTeamGuestByGuestId(
    adminClient,
    guestId
  );
  if (membership.error) {
    const message =
      membership.error.message || "Unable to look up guest team membership.";
    logOpsError("releaseGuestFromTeam.membership", membership.error, {
      guestId,
      previousStatus,
      nextStatus,
    });
    return { released: false, error: message };
  }
  if (!membership.data) {
    return { released: false, error: null };
  }

  const { error } = await teamRepository.removeGuestFromTeam(
    adminClient,
    guestId
  );
  if (error) {
    const message = error.message || "Unable to release guest from team.";
    logOpsError("releaseGuestFromTeam.remove", error, {
      guestId,
      teamId: membership.data.team_id,
      previousStatus,
      nextStatus,
    });
    return { released: false, error: message };
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

  return { released: true, error: null };
}
