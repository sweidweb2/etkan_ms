"use server";

import {
  runManagerAction,
  runManagerMutation,
} from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerSubjectDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { revalidatePath } from "next/cache";
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
  return runManagerAction({
    formData,
    parse: parseCreateCategoryFormData,
    mutate: ({ adminClient, actor, data }) =>
      createCategoryForManager(adminClient, actor.userId, actor, data),
    revalidate: () => revalidateCatalogAndSubjects(),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      category: result.category,
    }),
  });
}

export async function updateCategoryAction(
  _prevState: UpdateCategoryActionState,
  formData: FormData
): Promise<UpdateCategoryActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateCategoryFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateCategoryForManager(adminClient, actor.userId, actor, data),
    revalidate: () => revalidateCatalogAndSubjects(),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      category: result.category,
    }),
  });
}

export async function deleteCategoryAction(
  _prevState: DeleteCategoryActionState,
  formData: FormData
): Promise<DeleteCategoryActionState> {
  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    return { success: false, error: "Category not found." };
  }

  return runManagerMutation({
    data: categoryId,
    mutate: ({ adminClient, actor, data }) =>
      deleteCategoryForManager(adminClient, actor.userId, actor, data),
    revalidate: () => revalidateCatalogAndSubjects(),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function createExerciseAction(
  _prevState: CreateExerciseActionState,
  formData: FormData
): Promise<CreateExerciseActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateExerciseFormData,
    mutate: ({ adminClient, actor, data }) =>
      createExerciseForManager(adminClient, actor.userId, actor, data),
    revalidate: () => revalidateCatalogAndSubjects(),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      exercise: result.exercise,
    }),
  });
}

export async function updateExerciseAction(
  _prevState: UpdateExerciseActionState,
  formData: FormData
): Promise<UpdateExerciseActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateExerciseFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateExerciseForManager(adminClient, actor.userId, actor, data),
    revalidate: () => revalidateCatalogAndSubjects(),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      exercise: result.exercise,
    }),
  });
}

export async function deleteExerciseAction(
  _prevState: DeleteExerciseActionState,
  formData: FormData
): Promise<DeleteExerciseActionState> {
  const exerciseId = String(formData.get("exercise_id") ?? "").trim();
  if (!exerciseId) {
    return { success: false, error: "Exercise not found." };
  }

  return runManagerMutation({
    data: exerciseId,
    mutate: ({ adminClient, actor, data }) =>
      deleteExerciseForManager(adminClient, actor.userId, actor, data),
    revalidate: () => revalidateCatalogAndSubjects(),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function syncSubjectCatalogLinksAction(
  _prevState: SyncSubjectCatalogLinksActionState,
  formData: FormData
): Promise<SyncSubjectCatalogLinksActionState> {
  return runManagerAction({
    formData,
    parse: parseSyncSubjectCatalogLinksFormData,
    mutate: ({ adminClient, actor, data }) =>
      syncSubjectCatalogLinksForManager(adminClient, actor.userId, actor, data),
    revalidate: (_result, data) => revalidateCatalogAndSubjects(data.subject_id),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

// Keep getSessionAuditActor import unused check happy if tree-shaken — not needed.
void getSessionAuditActor;
void createSupabaseAdminClient;
