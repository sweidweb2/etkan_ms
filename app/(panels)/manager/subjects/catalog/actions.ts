"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerSubjectDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateCategoryFormData } from "@/lib/validators/manager/create-category";
import { parseUpdateCategoryFormData } from "@/lib/validators/manager/update-category";
import { parseCreateExerciseFormData } from "@/lib/validators/manager/create-exercise";
import { parseUpdateExerciseFormData } from "@/lib/validators/manager/update-exercise";
import { parseSyncSubjectCatalogLinksFormData } from "@/lib/validators/manager/sync-subject-catalog-links";
import {
  createCategoryForManager,
  deleteCategoryForManager,
  updateCategoryForManager,
} from "@/services/classes/category.service";
import {
  createExerciseForManager,
  deleteExerciseForManager,
  syncSubjectCatalogLinksForManager,
  updateExerciseForManager,
} from "@/services/classes/exercise.service";
import type {
  CreateCategoryActionState,
  DeleteCategoryActionState,
  UpdateCategoryActionState,
} from "@/types/manager-category";
import type {
  CreateExerciseActionState,
  DeleteExerciseActionState,
  SyncSubjectCatalogLinksActionState,
  UpdateExerciseActionState,
} from "@/types/manager-exercise";

function revalidateCatalogAndSubjects(subjectId?: string) {
  revalidatePath(ROUTES.MANAGER_SUBJECTS);
  revalidatePath(ROUTES.MANAGER_SUBJECTS_CATALOG);
  if (subjectId) {
    revalidatePath(getManagerSubjectDetailRoute(subjectId));
  }
}

export async function createCategoryAction(
  _prevState: CreateCategoryActionState,
  formData: FormData
): Promise<CreateCategoryActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateCategoryFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createCategoryForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidateCatalogAndSubjects();
  return {
    success: true,
    message: result.message,
    category: result.category,
  };
}

export async function updateCategoryAction(
  _prevState: UpdateCategoryActionState,
  formData: FormData
): Promise<UpdateCategoryActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateCategoryFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateCategoryForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidateCatalogAndSubjects();
  return {
    success: true,
    message: result.message,
    category: result.category,
  };
}

export async function deleteCategoryAction(
  _prevState: DeleteCategoryActionState,
  formData: FormData
): Promise<DeleteCategoryActionState> {
  const actor = await getSessionAuditActor();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    return { success: false, error: "Category not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteCategoryForManager(
    adminClient,
    actor.userId,
    actor,
    categoryId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateCatalogAndSubjects();
  return { success: true, message: result.message };
}

export async function createExerciseAction(
  _prevState: CreateExerciseActionState,
  formData: FormData
): Promise<CreateExerciseActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateExerciseFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createExerciseForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidateCatalogAndSubjects();
  return {
    success: true,
    message: result.message,
    exercise: result.exercise,
  };
}

export async function updateExerciseAction(
  _prevState: UpdateExerciseActionState,
  formData: FormData
): Promise<UpdateExerciseActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateExerciseFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateExerciseForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidateCatalogAndSubjects();
  return {
    success: true,
    message: result.message,
    exercise: result.exercise,
  };
}

export async function deleteExerciseAction(
  _prevState: DeleteExerciseActionState,
  formData: FormData
): Promise<DeleteExerciseActionState> {
  const actor = await getSessionAuditActor();
  const exerciseId = String(formData.get("exercise_id") ?? "").trim();
  if (!exerciseId) {
    return { success: false, error: "Exercise not found." };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteExerciseForManager(
    adminClient,
    actor.userId,
    actor,
    exerciseId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateCatalogAndSubjects();
  return { success: true, message: result.message };
}

export async function syncSubjectCatalogLinksAction(
  _prevState: SyncSubjectCatalogLinksActionState,
  formData: FormData
): Promise<SyncSubjectCatalogLinksActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSyncSubjectCatalogLinksFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await syncSubjectCatalogLinksForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidateCatalogAndSubjects(parsed.data.subject_id);
  return { success: true, message: result.message };
}
