import { GUEST_CURRENT_STATUSES, isGuestCurrentStatus } from "@/lib/constants/guest";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { isTeamStatus, TEAM_STATUS_LABELS, type TeamStatus } from "@/lib/constants/team";
import { assignGuestToTeamSchema } from "@/lib/validators/manager/assign-guest-to-team";
import { createTeamSchema } from "@/lib/validators/manager/create-team";
import { updateTeamSchema } from "@/lib/validators/manager/update-team";
import * as guestRepository from "@/repositories/guest.repository";
import * as teamRepository from "@/repositories/team.repository";
import type { TeamRecord } from "@/repositories/team.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerGuestRow } from "@/types/manager-guest";
import type { ManagerTeamRow } from "@/types/manager-team";
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

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateTeamResult =
  | { success: true; team: ManagerTeamRow; message: string }
  | MutationFailure;

export type UpdateTeamResult =
  | { success: true; team: ManagerTeamRow; message: string }
  | MutationFailure;

export type DeleteTeamResult =
  | { success: true; teamId: string; message: string }
  | MutationFailure;

export type AssignGuestToTeamResult =
  | {
      success: true;
      guestId: string;
      teamId: string | null;
      message: string;
    }
  | MutationFailure;

function mapTeamRecordToRow(
  record: TeamRecord,
  guests: ManagerGuestRow[]
): ManagerTeamRow {
  if (!isTeamStatus(record.status)) {
    throw new Error("Invalid team status record.");
  }

  return {
    id: record.id,
    name: record.name,
    expected_start_date: record.expected_start_date,
    status: record.status,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
    guests,
  };
}

function mapGuestRecordToRow(
  record: guestRepository.GuestRecord
): ManagerGuestRow {
  if (!isGuestCurrentStatus(record.status)) {
    throw new Error("Invalid guest status record.");
  }

  return {
    id: record.id,
    full_name: record.full_name,
    phone: record.phone,
    age: record.age,
    school_or_university: record.school_or_university,
    education_level:
      record.education_level as ManagerGuestRow["education_level"],
    interested_service:
      record.interested_service as ManagerGuestRow["interested_service"],
    referred_from: record.referred_from as ManagerGuestRow["referred_from"],
    referred_from_other: record.referred_from_other,
    status: record.status,
    notes: record.notes,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function auditPayload(record: TeamRecord) {
  return {
    name: record.name,
    expected_start_date: record.expected_start_date,
    status: record.status,
  };
}

/** Teams with their members resolved from the guests list. */
export async function listTeamsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerTeamRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TEAMS_VIEW);

  const [teamsResult, membershipResult, guestsResult] = await Promise.all([
    teamRepository.listTeams(adminClient),
    teamRepository.listTeamGuests(adminClient),
    guestRepository.listGuests(adminClient),
  ]);

  if (teamsResult.error) {
    throw new Error(teamsResult.error.message);
  }
  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }
  if (guestsResult.error) {
    throw new Error(guestsResult.error.message);
  }

  const guestsById = new Map(
    (guestsResult.data ?? []).map((record) => [
      record.id,
      mapGuestRecordToRow(record),
    ])
  );

  const membersByTeam = new Map<string, ManagerGuestRow[]>();

  for (const membership of membershipResult.data ?? []) {
    const guest = guestsById.get(membership.guest_id);
    if (!guest) {
      continue;
    }
    const bucket = membersByTeam.get(membership.team_id);
    if (bucket) {
      bucket.push(guest);
    } else {
      membersByTeam.set(membership.team_id, [guest]);
    }
  }

  return (teamsResult.data ?? []).map((record) =>
    mapTeamRecordToRow(record, membersByTeam.get(record.id) ?? [])
  );
}

export async function createTeamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    expected_start_date?: string | null;
    status?: TeamStatus;
  }
): Promise<CreateTeamResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TEAMS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, expected_start_date, status } = parsed.data;

  const { data, error } = await teamRepository.createTeam(adminClient, {
    name,
    expected_start_date,
    status,
    created_by: actor.userId,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapTeamWriteError(error?.message, "create"),
      fieldErrors: teamNameConflictFieldErrors(error?.message),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "teams",
    record_id: data.id,
    new_data: auditPayload(data),
    metadata: { note: `Team created as ${TEAM_STATUS_LABELS[status]}.` },
  });

  return {
    success: true,
    team: mapTeamRecordToRow(data, []),
    message: "Team created.",
  };
}

export async function updateTeamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    expected_start_date?: string | null;
    status?: TeamStatus;
  }
): Promise<UpdateTeamResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TEAMS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, name, expected_start_date, status } = parsed.data;

  const existing = await teamRepository.findTeamById(adminClient, id);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Team not found." };
  }

  const { data, error } = await teamRepository.updateTeam(adminClient, id, {
    name,
    expected_start_date,
    status,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapTeamWriteError(error?.message, "update"),
      fieldErrors: teamNameConflictFieldErrors(error?.message),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "teams",
    record_id: data.id,
    old_data: auditPayload(existing.data),
    new_data: auditPayload(data),
    metadata: { note: "Team updated." },
  });

  const members = await listTeamMembers(adminClient, id);

  return {
    success: true,
    team: mapTeamRecordToRow(data, members),
    message: "Team updated.",
  };
}

export async function deleteTeamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  teamId: string
): Promise<DeleteTeamResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TEAMS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await teamRepository.findTeamById(adminClient, teamId);
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Team not found." };
  }

  // team_guests cascades on delete, which releases members back to the guests table.
  const { error } = await teamRepository.deleteTeamById(adminClient, teamId);
  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete team. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "teams",
    record_id: teamId,
    old_data: auditPayload(existing.data),
    metadata: { note: "Team deleted; members released back to guests." },
  });

  return { success: true, teamId, message: "Team deleted." };
}

export async function assignGuestToTeamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { guest_id: string; team_id: string | null }
): Promise<AssignGuestToTeamResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TEAMS_ASSIGN_GUEST
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignGuestToTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { guest_id: guestId, team_id: teamId } = parsed.data;

  const guest = await guestRepository.findGuestById(adminClient, guestId);
  if (guest.error) {
    return { success: false, error: guest.error.message };
  }
  if (!guest.data) {
    return { success: false, error: "Guest not found." };
  }

  if (teamId === null) {
    const { error } = await teamRepository.removeGuestFromTeam(
      adminClient,
      guestId
    );
    if (error) {
      return {
        success: false,
        error: error.message || "Unable to remove guest from team.",
      };
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "delete",
      severity: "info",
      table_name: "team_guests",
      record_id: guestId,
      old_data: { guest_id: guestId },
      metadata: { note: `${guest.data.full_name} removed from team.` },
    });

    return {
      success: true,
      guestId,
      teamId: null,
      message: `${guest.data.full_name} moved back to guests.`,
    };
  }

  const team = await teamRepository.findTeamById(adminClient, teamId);
  if (team.error) {
    return { success: false, error: team.error.message };
  }
  if (!team.data) {
    return { success: false, error: "Team not found." };
  }

  const { data, error } = await teamRepository.assignGuestToTeam(adminClient, {
    teamId,
    guestId,
    createdBy: actor.userId,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to assign guest to team.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "team_guests",
    record_id: data.id,
    new_data: { team_id: teamId, guest_id: guestId },
    metadata: {
      note: `${guest.data.full_name} assigned to ${team.data.name}.`,
    },
  });

  return {
    success: true,
    guestId,
    teamId,
    message: `${guest.data.full_name} added to ${team.data.name}.`,
  };
}

async function listTeamMembers(
  adminClient: Supabase,
  teamId: string
): Promise<ManagerGuestRow[]> {
  const [membershipResult, guestsResult] = await Promise.all([
    teamRepository.listTeamGuests(adminClient),
    guestRepository.listGuests(adminClient),
  ]);

  if (membershipResult.error || guestsResult.error) {
    return [];
  }

  const guestsById = new Map(
    (guestsResult.data ?? []).map((record) => [record.id, record])
  );

  const members: ManagerGuestRow[] = [];
  for (const membership of membershipResult.data ?? []) {
    if (membership.team_id !== teamId) {
      continue;
    }
    const record = guestsById.get(membership.guest_id);
    if (record) {
      members.push(mapGuestRecordToRow(record));
    }
  }

  return members;
}

function isUniqueNameViolation(message: string | undefined): boolean {
  return Boolean(message && message.includes("teams_name_lower_unique"));
}

function teamNameConflictFieldErrors(
  message: string | undefined
): FieldErrors | undefined {
  return isUniqueNameViolation(message)
    ? { name: ["A team with this name already exists."] }
    : undefined;
}

function mapTeamWriteError(
  message: string | undefined,
  mode: "create" | "update"
): string {
  if (isUniqueNameViolation(message)) {
    return "Please fix the errors below.";
  }
  return (
    message ||
    (mode === "create"
      ? "Unable to create team. Please try again."
      : "Unable to update team. Please try again.")
  );
}
