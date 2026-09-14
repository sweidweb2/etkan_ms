import { PERMISSIONS } from "@/lib/constants/permissions";
import { createCategorySchema } from "@/lib/validators/manager/create-category";
import { updateCategorySchema } from "@/lib/validators/manager/update-category";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as categoryRepository from "@/repositories/category.repository";
import type { CategoryRecord } from "@/repositories/category.repository";
import * as exerciseRepository from "@/repositories/exercise.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

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

function mapCategory(record: CategoryRecord): ManagerCategoryRow {
  return {
    id: record.id,
    parent_id: record.parent_id,
    name: record.name,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function normalizeParentId(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapUniqueNameError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A category with this name already exists.";
  }
  return "Unable to save category. Please try again.";
}

async function wouldCreateParentCycle(
  adminClient: Supabase,
  categoryId: string,
  parentId: string | null
): Promise<boolean> {
  if (!parentId) {
    return false;
  }
  if (parentId === categoryId) {
    return true;
  }

  let currentId: string | null = parentId;
  const visited = new Set<string>([categoryId]);

  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    const { data, error } = await categoryRepository.findCategoryById(
      adminClient,
      currentId
    );
    if (error) {
      throw new Error(error.message);
    }
    currentId = data?.parent_id ?? null;
  }

  return false;
}

export async function listCategoriesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerCategoryRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_CATEGORIES_VIEW
  );

  const { data, error } = await categoryRepository.listCategories(adminClient);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCategory);
}

export async function createCategoryForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<
  MutationSuccess<{ category: ManagerCategoryRow }> | MutationFailure
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_CATEGORIES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const parentId = normalizeParentId(parsed.data.parent_id);
  if (parentId) {
    const { data: parent, error: parentError } =
      await categoryRepository.findCategoryById(adminClient, parentId);
    if (parentError) {
      return { success: false, error: parentError.message };
    }
    if (!parent) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { parent_id: ["Parent category not found."] },
      };
    }
  }

  const { data, error } = await categoryRepository.createCategory(adminClient, {
    name: parsed.data.name,
    parent_id: parentId,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapUniqueNameError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, {
    actor,
    action: "insert",
    tableName: "categories",
    recordId: data.id,
    newData: { name: data.name, parent_id: data.parent_id },
    metadata: { note: "Category created." },
  });

  return {
    success: true,
    message: "Category was created.",
    category: mapCategory(data),
  };
}

export async function updateCategoryForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<
  MutationSuccess<{ category: ManagerCategoryRow }> | MutationFailure
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_CATEGORIES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { data: existing, error: existingError } =
    await categoryRepository.findCategoryById(adminClient, parsed.data.id);
  if (existingError) {
    return { success: false, error: existingError.message };
  }
  if (!existing) {
    return { success: false, error: "Category not found." };
  }

  const parentId = normalizeParentId(parsed.data.parent_id);
  if (parentId) {
    const { data: parent, error: parentError } =
      await categoryRepository.findCategoryById(adminClient, parentId);
    if (parentError) {
      return { success: false, error: parentError.message };
    }
    if (!parent) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { parent_id: ["Parent category not found."] },
      };
    }
  }

  if (await wouldCreateParentCycle(adminClient, parsed.data.id, parentId)) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        parent_id: [
          "A category cannot be nested under itself or its children.",
        ],
      },
    };
  }

  const { data, error } = await categoryRepository.updateCategoryById(
    adminClient,
    parsed.data.id,
    { name: parsed.data.name, parent_id: parentId }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUniqueNameError(error?.message ?? "Unknown error"),
    };
  }

  if (existing.name !== data.name) {
    const { data: linkedExercises, error: listError } =
      await categoryRepository.listExercisesUsingCategoryName(
        adminClient,
        existing.name
      );
    if (listError) {
      return { success: false, error: listError.message };
    }

    for (const exercise of linkedExercises ?? []) {
      const nextNames = (exercise.categories ?? []).map((name) =>
        name === existing.name ? data.name : name
      );
      const { error: renameError } =
        await exerciseRepository.updateExerciseCategoriesById(
          adminClient,
          exercise.id,
          nextNames
        );
      if (renameError) {
        return { success: false, error: renameError.message };
      }
    }
  }

  await recordManagerAuditLog(adminClient, {
    actor,
    action: "update",
    tableName: "categories",
    recordId: data.id,
    oldData: { name: existing.name, parent_id: existing.parent_id },
    newData: { name: data.name, parent_id: data.parent_id },
    metadata: { note: "Category updated." },
  });

  return {
    success: true,
    message: "Category was updated.",
    category: mapCategory(data),
  };
}

export async function deleteCategoryForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  categoryId: string
): Promise<MutationSuccess<Record<string, never>> | MutationFailure> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_CATEGORIES_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const { data: existing, error: existingError } =
    await categoryRepository.findCategoryById(adminClient, categoryId);
  if (existingError) {
    return { success: false, error: existingError.message };
  }
  if (!existing) {
    return { success: false, error: "Category not found." };
  }

  const [{ count: exerciseLinks, error: exerciseCountError }, { count: subjectLinks, error: subjectCountError }] =
    await Promise.all([
      categoryRepository.countCategoryExercises(adminClient, categoryId),
      categoryRepository.countSubjectCategories(adminClient, categoryId),
    ]);

  if (exerciseCountError) {
    return { success: false, error: exerciseCountError.message };
  }
  if (subjectCountError) {
    return { success: false, error: subjectCountError.message };
  }
  if ((exerciseLinks ?? 0) > 0 || (subjectLinks ?? 0) > 0) {
    return {
      success: false,
      error:
        "This category is linked to exercises or subjects. Unlink it before deleting.",
    };
  }

  const { error } = await categoryRepository.deleteCategoryById(
    adminClient,
    categoryId
  );
  if (error) {
    return { success: false, error: error.message };
  }

  await recordManagerAuditLog(adminClient, {
    actor,
    action: "delete",
    tableName: "categories",
    recordId: categoryId,
    oldData: { name: existing.name, parent_id: existing.parent_id },
    metadata: { note: "Category deleted." },
  });

  return { success: true, message: "Category was deleted." };
}
