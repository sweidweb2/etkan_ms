import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import { createStageSchema } from "@/lib/validators/manager/create-stage";
import { assignSubjectsToStageSchema } from "@/lib/validators/manager/assign-subjects-to-stage";
import { reorderStagesSchema } from "@/lib/validators/manager/reorder-stages";
import { saveSubjectBoardSchema } from "@/lib/validators/manager/save-subject-board";
import { setSubjectStageSchema } from "@/lib/validators/manager/set-subject-stage";
import * as stageRepository from "@/repositories/stage.repository";
import type { StageRecord } from "@/repositories/stage.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerStageRow } from "@/types/manager-stage";
import type { ManagerSubjectRow } from "@/types/manager-subject";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateStageSuccess = {
  success: true;
  stage: ManagerStageRow;
  message: string;
};

export type CreateStageFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateStageResult = CreateStageSuccess | CreateStageFailure;

export type SetSubjectStageSuccess = {
  success: true;
  subject: ManagerSubjectRow;
  message: string;
};

export type SetSubjectStageFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type SetSubjectStageResult =
  | SetSubjectStageSuccess
  | SetSubjectStageFailure;

export type AssignSubjectsToStageSuccess = {
  success: true;
  subjects: ManagerSubjectRow[];
  stageId: string | null;
  message: string;
};

export type AssignSubjectsToStageFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type AssignSubjectsToStageResult =
  | AssignSubjectsToStageSuccess
  | AssignSubjectsToStageFailure;

export type ReorderStagesSuccess = {
  success: true;
  stages: ManagerStageRow[];
  message: string;
};

export type ReorderStagesFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ReorderStagesResult = ReorderStagesSuccess | ReorderStagesFailure;

export type SaveSubjectBoardSuccess = {
  success: true;
  message: string;
};

export type SaveSubjectBoardFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type SaveSubjectBoardResult =
  | SaveSubjectBoardSuccess
  | SaveSubjectBoardFailure;

function mapStageRecordToRow(record: StageRecord): ManagerStageRow {
  return {
    id: record.id,
    name: record.name,
    period: record.period,
    level: record.level,
    sort_order: record.sort_order,
    created_at: record.created_at,
  };
}

function mapSubjectPlacementRow(
  record: {
    id: string;
    name: string;
    syllabus_link: string | null;
    reference_link: string | null;
    handout_link: string | null;
    created_at: string | null;
    nb_sessions: number;
    stage_id: string | null;
    sort_order: number;
  },
  classCount = 0
): ManagerSubjectRow {
  return {
    id: record.id,
    name: record.name,
    syllabus_link: record.syllabus_link,
    reference_link: record.reference_link,
    handout_link: record.handout_link,
    created_at: record.created_at ?? "",
    nb_sessions: record.nb_sessions,
    class_count: classCount,
    stage_id: record.stage_id,
    sort_order: record.sort_order,
  };
}

function mapCreateStageError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A stage with this name already exists.";
  }

  return "Unable to create stage. Please try again.";
}

export async function listStagesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerStageRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SUBJECTS_VIEW);

  const { data, error } = await stageRepository.listStages(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapStageRecordToRow);
}

export async function createStageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    period: number;
    level: number;
  }
): Promise<CreateStageResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_STAGES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createStageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, period, level } = parsed.data;
  const normalizedName = name.trim();

  const existing = await stageRepository.findStageByName(
    adminClient,
    normalizedName
  );

  if (existing.error) {
    return {
      success: false,
      error: mapCreateStageError(existing.error.message),
    };
  }

  if (existing.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A stage with this name already exists."] },
    };
  }

  const nextSort = await stageRepository.getNextStageSortOrder(adminClient);
  if (nextSort.error) {
    return {
      success: false,
      error: mapCreateStageError(nextSort.error.message),
    };
  }

  const { data, error } = await stageRepository.createStage(adminClient, {
    name: normalizedName,
    period,
    level,
    sort_order: nextSort.data ?? 0,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapCreateStageError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "stages",
    record_id: data.id,
    new_data: {
      name: data.name,
      period: data.period,
      level: data.level,
      sort_order: data.sort_order,
    },
    metadata: { note: "Stage created." },
  });

  return {
    success: true,
    stage: mapStageRecordToRow(data),
    message: "Stage created.",
  };
}

export async function reorderStagesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { ordered_ids: string[] }
): Promise<ReorderStagesResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_STAGES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = reorderStagesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orderedIds = [...new Set(parsed.data.ordered_ids)];
  const existing = await stageRepository.listStages(adminClient);
  if (existing.error) {
    return { success: false, error: "Unable to reorder stages. Please try again." };
  }

  const existingIds = new Set((existing.data ?? []).map((row) => row.id));
  if (
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { success: false, error: "Stage list is out of date. Refresh and try again." };
  }

  const { error } = await stageRepository.updateStageSortOrders(
    adminClient,
    orderedIds
  );
  if (error) {
    return { success: false, error: "Unable to reorder stages. Please try again." };
  }

  const refreshed = await stageRepository.listStages(adminClient);
  if (refreshed.error || !refreshed.data) {
    return { success: false, error: "Unable to reorder stages. Please try again." };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "stages",
    record_id: orderedIds[0] ?? null,
    new_data: { ordered_ids: orderedIds },
    metadata: { note: "Stages reordered." },
  });

  return {
    success: true,
    stages: refreshed.data.map(mapStageRecordToRow),
    message: "Stage order saved.",
  };
}

export async function saveSubjectBoardForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { columns: Record<string, string[]> }
): Promise<SaveSubjectBoardResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = saveSubjectBoardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const columns = parsed.data.columns;
  const stageIds = Object.keys(columns).filter(
    (key) => key !== UNASSIGNED_STAGE_ID
  );

  if (stageIds.length > 0) {
    const stagesResult = await stageRepository.listStages(adminClient);
    if (stagesResult.error) {
      return {
        success: false,
        error: "Unable to save board. Please try again.",
      };
    }
    const known = new Set((stagesResult.data ?? []).map((row) => row.id));
    if (stageIds.some((id) => !known.has(id))) {
      return { success: false, error: "One or more stages were not found." };
    }
  }

  const placements: Array<{
    id: string;
    stage_id: string | null;
    sort_order: number;
  }> = [];
  const seen = new Set<string>();

  for (const [columnId, subjectIds] of Object.entries(columns)) {
    const stageId = columnId === UNASSIGNED_STAGE_ID ? null : columnId;
    subjectIds.forEach((subjectId, index) => {
      if (seen.has(subjectId)) {
        return;
      }
      seen.add(subjectId);
      placements.push({
        id: subjectId,
        stage_id: stageId,
        sort_order: index,
      });
    });
  }

  if (placements.length === 0) {
    return { success: true, message: "Board unchanged." };
  }

  const { error } = await subjectRepository.updateSubjectBoardPositions(
    adminClient,
    placements
  );
  if (error) {
    return {
      success: false,
      error: "Unable to save board. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "subjects",
    record_id: placements[0]?.id ?? null,
    new_data: { columns },
    metadata: { note: "Subject board positions saved." },
  });

  return {
    success: true,
    message: "Board saved.",
  };
}

export async function setSubjectStageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    subject_id: string;
    stage_id: string | null;
  }
): Promise<SetSubjectStageResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = setSubjectStageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { subject_id: subjectId, stage_id: stageId } = parsed.data;

  const [subjectResult, stageResult] = await Promise.all([
    subjectRepository.findSubjectById(adminClient, subjectId),
    stageId
      ? stageRepository.findStageById(adminClient, stageId)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (subjectResult.error) {
    return {
      success: false,
      error: "Unable to update subject stage. Please try again.",
    };
  }

  if (!subjectResult.data) {
    return { success: false, error: "Subject not found." };
  }

  if (stageId) {
    if (stageResult.error) {
      return {
        success: false,
        error: "Unable to update subject stage. Please try again.",
      };
    }

    if (!stageResult.data) {
      return { success: false, error: "Stage not found." };
    }
  }

  if (subjectResult.data.stage_id === stageId) {
    return {
      success: true,
      subject: mapSubjectPlacementRow(subjectResult.data),
      message: "Subject stage unchanged.",
    };
  }

  const nextSort = await subjectRepository.getNextSubjectSortOrderForStage(
    adminClient,
    stageId
  );
  if (nextSort.error) {
    return {
      success: false,
      error: "Unable to update subject stage. Please try again.",
    };
  }

  const { data, error } = await subjectRepository.updateSubjectStageById(
    adminClient,
    subjectId,
    stageId,
    nextSort.data ?? 0
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to update subject stage. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "subjects",
    record_id: data.id,
    old_data: {
      stage_id: subjectResult.data.stage_id,
      sort_order: subjectResult.data.sort_order,
    },
    new_data: { stage_id: data.stage_id, sort_order: data.sort_order },
    metadata: { note: "Subject stage updated." },
  });

  return {
    success: true,
    subject: mapSubjectPlacementRow(data),
    message: "Subject stage updated.",
  };
}

export async function assignSubjectsToStageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    stage_id: string | null;
    subject_ids: string[];
  }
): Promise<AssignSubjectsToStageResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignSubjectsToStageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { stage_id: stageId, subject_ids: subjectIds } = parsed.data;
  const uniqueSubjectIds = [...new Set(subjectIds)];

  if (stageId) {
    const stageResult = await stageRepository.findStageById(
      adminClient,
      stageId
    );

    if (stageResult.error) {
      return {
        success: false,
        error: "Unable to assign subjects. Please try again.",
      };
    }

    if (!stageResult.data) {
      return { success: false, error: "Stage not found." };
    }
  }

  const nextSort = await subjectRepository.getNextSubjectSortOrderForStage(
    adminClient,
    stageId
  );
  if (nextSort.error) {
    return {
      success: false,
      error: "Unable to assign subjects. Please try again.",
    };
  }

  let sortCursor = nextSort.data ?? 0;
  const placements = uniqueSubjectIds.map((id) => {
    const placement = {
      id,
      stage_id: stageId,
      sort_order: sortCursor,
    };
    sortCursor += 1;
    return placement;
  });

  const { error } = await subjectRepository.updateSubjectBoardPositions(
    adminClient,
    placements
  );

  if (error) {
    return {
      success: false,
      error: "Unable to assign subjects. Please try again.",
    };
  }

  const listed = await subjectRepository.listSubjects(adminClient);
  if (listed.error) {
    return {
      success: false,
      error: "Unable to assign subjects. Please try again.",
    };
  }

  const byId = new Map((listed.data ?? []).map((row) => [row.id, row]));
  const subjects = uniqueSubjectIds.map((id) => {
    const row = byId.get(id);
    if (!row) {
      return null;
    }
    return mapSubjectPlacementRow(row);
  });

  if (subjects.some((row) => row === null)) {
    return {
      success: false,
      error: "One or more subjects were not found.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "subjects",
    record_id: uniqueSubjectIds[0] ?? null,
    new_data: {
      stage_id: stageId,
      subject_ids: uniqueSubjectIds,
    },
    metadata: { note: "Subjects assigned to stage." },
  });

  return {
    success: true,
    subjects: subjects as ManagerSubjectRow[],
    stageId,
    message:
      uniqueSubjectIds.length === 1
        ? "Subject assigned to stage."
        : `${uniqueSubjectIds.length} subjects assigned to stage.`,
  };
}
