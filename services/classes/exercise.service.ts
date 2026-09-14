import {
  EXERCISE_LEVEL_VALUES,
  type ExerciseLevelValue,
} from "@/lib/constants/exercise-level";
import {
  EXERCISE_STATUS_VALUES,
  type ExerciseStatusValue,
} from "@/lib/constants/exercise-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createExerciseSchema } from "@/lib/validators/manager/create-exercise";
import { updateExerciseSchema } from "@/lib/validators/manager/update-exercise";
import { syncSubjectCatalogLinksSchema } from "@/lib/validators/manager/sync-subject-catalog-links";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as categoryRepository from "@/repositories/category.repository";
import * as exerciseRepository from "@/repositories/exercise.repository";
import type { ExerciseRecord } from "@/repositories/exercise.repository";
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
import type { ManagerExerciseRow } from "@/types/manager-exercise";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationSuccess<T> = {
  success: true;
  message: string;
} & T;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function mapLevel(value: string): ExerciseLevelValue {
  if (
    (EXERCISE_LEVEL_VALUES as readonly string[]).includes(value)
  ) {
    return value as ExerciseLevelValue;
  }
  return "easy";
}

function mapStatus(value: string): ExerciseStatusValue {
  if (
    (EXERCISE_STATUS_VALUES as readonly string[]).includes(value)
  ) {
    return value as ExerciseStatusValue;
  }
  return "active";
}

function mapExercise(
  record: ExerciseRecord,
  categoryIds: string[]
): ManagerExerciseRow {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    level: mapLevel(record.level),
    status: mapStatus(record.status),
    categories: record.categories ?? [],
    category_ids: categoryIds,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function fieldErrorsFromZod(
  fieldErrors: Record<string, string[] | undefined>
): FieldErrors {
  return zodFieldErrors(fieldErrors);
}

async function resolveCategoryNames(
  adminClient: Supabase,
  categoryIds: string[]
): Promise<
  | { success: true; names: string[]; orderedIds: string[] }
  | { success: false; error: string; fieldErrors?: FieldErrors }
> {
  const uniqueIds = [...new Set(categoryIds)];
  const { data, error } = await categoryRepository.findCategoriesByIds(
    adminClient,
    uniqueIds
  );
  if (error) {
    return { success: false, error: error.message };
  }
  if ((data ?? []).length !== uniqueIds.length) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { category_ids: ["One or more categories were not found."] },
    };
  }

  const byId = new Map((data ?? []).map((row) => [row.id, row.name]));
  return {
    success: true,
    orderedIds: uniqueIds,
    names: uniqueIds.map((id) => byId.get(id)!),
  };
}

async function categoryIdsByExerciseId(
  adminClient: Supabase,
  exerciseIds: string[]
): Promise<Map<string, string[]>> {
  const { data, error } =
    await categoryRepository.listCategoryExerciseLinksByExerciseIds(
      adminClient,
      exerciseIds
    );
  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.exercise_id) ?? [];
    list.push(row.category_id);
    map.set(row.exercise_id, list);
  }
  return map;
}

export async function listExercisesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerExerciseRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_EXERCISES_VIEW
  );

  const { data, error } = await exerciseRepository.listExercises(adminClient);
  if (error) {
    throw new Error(error.message);
  }

  const ids = (data ?? []).map((row) => row.id);
  const links = await categoryIdsByExerciseId(adminClient, ids);
  return (data ?? []).map((row) => mapExercise(row, links.get(row.id) ?? []));
}

export async function createExerciseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<
  MutationSuccess<{ exercise: ManagerExerciseRow }> | MutationFailure
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_EXERCISES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createExerciseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error.flatten().fieldErrors),
    };
  }

  const categories = await resolveCategoryNames(
    adminClient,
    parsed.data.category_ids
  );
  if (!categories.success) {
    return categories;
  }

  const { data, error } = await exerciseRepository.createExercise(adminClient, {
    title: parsed.data.title,
    body: parsed.data.body as Json,
    level: parsed.data.level,
    status: parsed.data.status,
    categories: categories.names,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to create exercise.",
    };
  }

  const { error: linkError } =
    await categoryRepository.replaceCategoryExercisesForExercise(
      adminClient,
      data.id,
      categories.orderedIds
    );
  if (linkError) {
    return { success: false, error: linkError.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "exercises",
    record_id: data.id,
    new_data: {
      title: data.title,
      level: data.level,
      status: data.status,
      categories: data.categories,
    },
    metadata: { note: "Exercise created." },
  });

  return {
    success: true,
    message: "Exercise was created.",
    exercise: mapExercise(data, categories.orderedIds),
  };
}

export async function updateExerciseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<
  MutationSuccess<{ exercise: ManagerExerciseRow }> | MutationFailure
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_EXERCISES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateExerciseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error.flatten().fieldErrors),
    };
  }

  const { data: existing, error: existingError } =
    await exerciseRepository.findExerciseById(adminClient, parsed.data.id);
  if (existingError) {
    return { success: false, error: existingError.message };
  }
  if (!existing) {
    return { success: false, error: "Exercise not found." };
  }

  const categories = await resolveCategoryNames(
    adminClient,
    parsed.data.category_ids
  );
  if (!categories.success) {
    return categories;
  }

  const { data, error } = await exerciseRepository.updateExerciseById(
    adminClient,
    parsed.data.id,
    {
      title: parsed.data.title,
      body: parsed.data.body as Json,
      level: parsed.data.level,
      status: parsed.data.status,
      categories: categories.names,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update exercise.",
    };
  }

  const { error: linkError } =
    await categoryRepository.replaceCategoryExercisesForExercise(
      adminClient,
      data.id,
      categories.orderedIds
    );
  if (linkError) {
    return { success: false, error: linkError.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "exercises",
    record_id: data.id,
    old_data: {
      title: existing.title,
      level: existing.level,
      status: existing.status,
      categories: existing.categories,
    },
    new_data: {
      title: data.title,
      level: data.level,
      status: data.status,
      categories: data.categories,
    },
    metadata: { note: "Exercise updated." },
  });

  return {
    success: true,
    message: "Exercise was updated.",
    exercise: mapExercise(data, categories.orderedIds),
  };
}

export async function deleteExerciseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  exerciseId: string
): Promise<{ success: true; message: string } | MutationFailure> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_EXERCISES_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const { data: existing, error: existingError } =
    await exerciseRepository.findExerciseById(adminClient, exerciseId);
  if (existingError) {
    return { success: false, error: existingError.message };
  }
  if (!existing) {
    return { success: false, error: "Exercise not found." };
  }

  const { count: subjectLinks, error: subjectCountError } =
    await exerciseRepository.countSubjectExercises(adminClient, exerciseId);

  if (subjectCountError) {
    return { success: false, error: subjectCountError.message };
  }
  if ((subjectLinks ?? 0) > 0) {
    return {
      success: false,
      error:
        "This exercise is linked to one or more subjects. Unlink it before deleting.",
    };
  }

  const { error } = await exerciseRepository.deleteExerciseById(
    adminClient,
    exerciseId
  );
  if (error) {
    return { success: false, error: error.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "exercises",
    record_id: exerciseId,
    old_data: {
      title: existing.title,
      level: existing.level,
      status: existing.status,
    },
    metadata: { note: "Exercise deleted." },
  });

  return { success: true, message: "Exercise was deleted." };
}

export async function listSubjectCatalogLinksForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  subjectId: string
): Promise<{ categoryIds: string[]; exerciseIds: string[] }> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SUBJECTS_VIEW);

  const [{ data: categories, error: catError }, { data: exercises, error: exError }] =
    await Promise.all([
      categoryRepository.listSubjectCategoryIds(adminClient, subjectId),
      exerciseRepository.listSubjectExerciseIds(adminClient, subjectId),
    ]);

  if (catError) {
    throw new Error(catError.message);
  }
  if (exError) {
    throw new Error(exError.message);
  }

  return {
    categoryIds: (categories ?? []).map((row) => row.category_id),
    exerciseIds: (exercises ?? []).map((row) => row.exercise_id),
  };
}

export async function syncSubjectCatalogLinksForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<{ success: true; message: string } | MutationFailure> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = syncSubjectCatalogLinksSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error.flatten().fieldErrors),
    };
  }

  const { data: subject, error: subjectError } =
    await subjectRepository.findSubjectById(
      adminClient,
      parsed.data.subject_id
    );
  if (subjectError) {
    return { success: false, error: subjectError.message };
  }
  if (!subject) {
    return { success: false, error: "Subject not found." };
  }

  const uniqueCategoryIds = [...new Set(parsed.data.category_ids)];
  const uniqueExerciseIds = [...new Set(parsed.data.exercise_ids)];

  if (uniqueCategoryIds.length > 0) {
    const { data, error } = await categoryRepository.findCategoriesByIds(
      adminClient,
      uniqueCategoryIds
    );
    if (error) {
      return { success: false, error: error.message };
    }
    if ((data ?? []).length !== uniqueCategoryIds.length) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { category_ids: ["One or more categories were not found."] },
      };
    }
  }

  if (uniqueExerciseIds.length > 0) {
    const { data, error } = await exerciseRepository.findExercisesByIds(
      adminClient,
      uniqueExerciseIds
    );
    if (error) {
      return { success: false, error: error.message };
    }
    if ((data ?? []).length !== uniqueExerciseIds.length) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { exercise_ids: ["One or more exercises were not found."] },
      };
    }
  }

  const { error: catReplaceError } =
    await categoryRepository.replaceSubjectCategories(
      adminClient,
      parsed.data.subject_id,
      uniqueCategoryIds
    );
  if (catReplaceError) {
    return { success: false, error: catReplaceError.message };
  }

  const { error: exReplaceError } =
    await exerciseRepository.replaceSubjectExercises(
      adminClient,
      parsed.data.subject_id,
      uniqueExerciseIds
    );
  if (exReplaceError) {
    return { success: false, error: exReplaceError.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "subjects",
    record_id: parsed.data.subject_id,
    new_data: {
      category_ids: uniqueCategoryIds,
      exercise_ids: uniqueExerciseIds,
    },
    metadata: { note: "Subject category and exercise links updated." },
  });

  return {
    success: true,
    message: "Subject links were saved.",
  };
}
