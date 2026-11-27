import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import { assignSemestersToTeamSchema } from "@/lib/validators/manager/assign-semesters-to-team";
import { createSemesterTeamSchema } from "@/lib/validators/manager/create-semester-team";
import { reorderSemesterTeamsSchema } from "@/lib/validators/manager/reorder-semester-teams";
import { saveSemesterBoardSchema } from "@/lib/validators/manager/save-semester-board";
import * as semesterRepository from "@/repositories/semester.repository";
import * as semesterTeamRepository from "@/repositories/semester-team.repository";
import type { SemesterTeamRecord } from "@/repositories/semester-team.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  reorderKanbanColumnsForManager,
  saveKanbanBoardForManager,
} from "@/services/shared/kanban-board-mutations";
import type { FieldErrors } from "@/types/auth";
import type { ManagerSemesterRow } from "@/types/manager-semester";
import type { ManagerSemesterTeamRow } from "@/types/manager-semester-team";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateSemesterTeamSuccess = {
  success: true;
  team: ManagerSemesterTeamRow;
  message: string;
};

export type CreateSemesterTeamFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateSemesterTeamResult =
  | CreateSemesterTeamSuccess
  | CreateSemesterTeamFailure;

export type AssignSemestersToTeamSuccess = {
  success: true;
  semesters: ManagerSemesterRow[];
  teamId: string | null;
  message: string;
};

export type AssignSemestersToTeamFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type AssignSemestersToTeamResult =
  | AssignSemestersToTeamSuccess
  | AssignSemestersToTeamFailure;

export type ReorderSemesterTeamsSuccess = {
  success: true;
  teams: ManagerSemesterTeamRow[];
  message: string;
};

export type ReorderSemesterTeamsFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ReorderSemesterTeamsResult =
  | ReorderSemesterTeamsSuccess
  | ReorderSemesterTeamsFailure;

export type SaveSemesterBoardSuccess = {
  success: true;
  message: string;
};

export type SaveSemesterBoardFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type SaveSemesterBoardResult =
  | SaveSemesterBoardSuccess
  | SaveSemesterBoardFailure;

function mapTeamRecordToRow(record: SemesterTeamRecord): ManagerSemesterTeamRow {
  return {
    id: record.id,
    name: record.name,
    sort_order: record.sort_order,
    created_at: record.created_at,
  };
}

function mapSemesterPlacementRow(record: {
  id: string;
  name: string;
  semester_code: string;
  created_at: string | null;
  team_id: string | null;
  sort_order: number;
}): ManagerSemesterRow {
  return {
    id: record.id,
    name: record.name,
    semester_code: record.semester_code,
    created_at: record.created_at ?? "",
    team_id: record.team_id,
    sort_order: record.sort_order,
  };
}

function mapCreateTeamError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A team with this name already exists.";
  }
  return "Unable to create team. Please try again.";
}

export async function listSemesterTeamsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerSemesterTeamRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_VIEW);

  const { data, error } =
    await semesterTeamRepository.listSemesterTeams(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTeamRecordToRow);
}

export async function createSemesterTeamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { name: string }
): Promise<CreateSemesterTeamResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SEMESTERS_TEAMS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createSemesterTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const normalizedName = parsed.data.name.trim();
  const existing = await semesterTeamRepository.findSemesterTeamByName(
    adminClient,
    normalizedName
  );

  if (existing.error) {
    return {
      success: false,
      error: mapCreateTeamError(existing.error.message),
    };
  }

  if (existing.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A team with this name already exists."] },
    };
  }

  const nextSort =
    await semesterTeamRepository.getNextSemesterTeamSortOrder(adminClient);
  if (nextSort.error) {
    return {
      success: false,
      error: mapCreateTeamError(nextSort.error.message),
    };
  }

  const { data, error } = await semesterTeamRepository.createSemesterTeam(
    adminClient,
    {
      name: normalizedName,
      sort_order: nextSort.data ?? 0,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapCreateTeamError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "semester_teams",
    record_id: data.id,
    new_data: {
      name: data.name,
      sort_order: data.sort_order,
    },
    metadata: { note: "Semester team created." },
  });

  return {
    success: true,
    team: mapTeamRecordToRow(data),
    message: "Team created.",
  };
}

export async function reorderSemesterTeamsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { ordered_ids: string[] }
): Promise<ReorderSemesterTeamsResult> {
  const result = await reorderKanbanColumnsForManager({
    adminClient,
    actorUserId,
    actor,
    permission: PERMISSIONS.SEMESTERS_TEAMS_UPDATE,
    schema: reorderSemesterTeamsSchema,
    input,
    listRows: () => semesterTeamRepository.listSemesterTeams(adminClient),
    updateSortOrders: (orderedIds) =>
      semesterTeamRepository.updateSemesterTeamSortOrders(
        adminClient,
        orderedIds
      ),
    mapRow: mapTeamRecordToRow,
    tableName: "semester_teams",
    outOfDateMessage: "Team list is out of date. Refresh and try again.",
    failMessage: "Unable to reorder teams. Please try again.",
    successMessage: "Team order saved.",
    auditNote: "Semester teams reordered.",
  });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    teams: result.rows,
    message: result.message,
  };
}

export async function saveSemesterBoardForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { columns: Record<string, string[]> }
): Promise<SaveSemesterBoardResult> {
  return saveKanbanBoardForManager({
    adminClient,
    actorUserId,
    actor,
    permission: PERMISSIONS.SEMESTERS_UPDATE,
    schema: saveSemesterBoardSchema,
    input,
    unassignedId: UNASSIGNED_TEAM_ID,
    listColumnEntities: () =>
      semesterTeamRepository.listSemesterTeams(adminClient),
    columnEntityNotFoundMessage: "One or more teams were not found.",
    buildPlacements: (columns) => {
      const placements: Array<{
        id: string;
        team_id: string | null;
        sort_order: number;
      }> = [];
      const seen = new Set<string>();

      for (const [columnId, semesterIds] of Object.entries(columns)) {
        const teamId = columnId === UNASSIGNED_TEAM_ID ? null : columnId;
        semesterIds.forEach((semesterId, index) => {
          if (seen.has(semesterId)) {
            return;
          }
          seen.add(semesterId);
          placements.push({
            id: semesterId,
            team_id: teamId,
            sort_order: index,
          });
        });
      }

      return placements;
    },
    validatePlacements: async (placements) => {
      const listed = await semesterRepository.listSemesters(adminClient);
      if (listed.error) {
        return {
          success: false,
          error: "Unable to save board. Please try again.",
        };
      }
      const knownSemesterIds = new Set(
        (listed.data ?? []).map((row) => row.id)
      );
      if (placements.some((placement) => !knownSemesterIds.has(placement.id))) {
        return {
          success: false,
          error: "One or more semesters were not found.",
        };
      }
      return null;
    },
    updatePositions: (placements) =>
      semesterRepository.updateSemesterBoardPositions(adminClient, placements),
    getPlacementRecordId: (placement) => placement.id,
    tableName: "semesters",
    failMessage: "Unable to save board. Please try again.",
    successMessage: "Board saved.",
    auditNote: "Semester board positions saved.",
  });
}

export async function assignSemestersToTeamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    team_id: string | null;
    semester_ids: string[];
  }
): Promise<AssignSemestersToTeamResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SEMESTERS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignSemestersToTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { team_id: teamId, semester_ids: semesterIds } = parsed.data;
  const uniqueSemesterIds = [...new Set(semesterIds)];

  if (teamId) {
    const teamResult = await semesterTeamRepository.findSemesterTeamById(
      adminClient,
      teamId
    );

    if (teamResult.error) {
      return {
        success: false,
        error: "Unable to assign semesters. Please try again.",
      };
    }

    if (!teamResult.data) {
      return { success: false, error: "Team not found." };
    }
  }

  const listed = await semesterRepository.listSemesters(adminClient);
  if (listed.error) {
    return {
      success: false,
      error: "Unable to assign semesters. Please try again.",
    };
  }

  const byId = new Map((listed.data ?? []).map((row) => [row.id, row]));
  if (uniqueSemesterIds.some((id) => !byId.has(id))) {
    return {
      success: false,
      error: "One or more semesters were not found.",
    };
  }

  const { error } = await semesterRepository.assignSemestersToTeam(
    adminClient,
    teamId,
    uniqueSemesterIds
  );

  if (error) {
    return {
      success: false,
      error: "Unable to assign semesters. Please try again.",
    };
  }

  const refreshed = await semesterRepository.listSemesters(adminClient);
  if (refreshed.error) {
    return {
      success: false,
      error: "Unable to assign semesters. Please try again.",
    };
  }

  const refreshedById = new Map(
    (refreshed.data ?? []).map((row) => [row.id, row])
  );
  const semesters = uniqueSemesterIds.flatMap((id) => {
    const row = refreshedById.get(id);
    return row ? [mapSemesterPlacementRow(row)] : [];
  });

  if (semesters.length !== uniqueSemesterIds.length) {
    return {
      success: false,
      error: "One or more semesters were not found.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "semesters",
    record_id: uniqueSemesterIds[0] ?? null,
    new_data: {
      team_id: teamId,
      semester_ids: uniqueSemesterIds,
    },
    metadata: { note: "Semesters assigned to team." },
  });

  return {
    success: true,
    semesters,
    teamId,
    message:
      uniqueSemesterIds.length === 1
        ? "Semester assigned to team."
        : `${uniqueSemesterIds.length} semesters assigned to team.`,
  };
}
