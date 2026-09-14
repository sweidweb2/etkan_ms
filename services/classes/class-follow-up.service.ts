import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  CLASS_CATEGORY_STATUSES,
} from "@/lib/constants/class-category-status";
import { partitionClassCategories } from "@/lib/classes/follow-up-state";
import { saveClassFollowUpSchema } from "@/lib/validators/manager/save-class-follow-up";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as categoryRepository from "@/repositories/category.repository";
import * as classCategoryRepository from "@/repositories/class-category.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { getClassForManager } from "@/services/classes/class.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type { ClassFollowUpPayload } from "@/types/manager-class-follow-up";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function mapCategory(
  record: categoryRepository.CategoryRecord
): ManagerCategoryRow {
  return {
    id: record.id,
    parent_id: record.parent_id,
    name: record.name,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export async function getClassFollowUpForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ClassFollowUpPayload | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const classRow = await getClassForManager(adminClient, actorUserId, classId);
  if (!classRow) {
    return null;
  }

  const [linksResult, categoriesResult] = await Promise.all([
    classCategoryRepository.listClassCategoriesByClassId(adminClient, classId),
    categoryRepository.listCategories(adminClient),
  ]);

  if (linksResult.error) {
    throw new Error(linksResult.error.message);
  }
  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  return {
    classRow,
    categories: (categoriesResult.data ?? []).map(mapCategory),
    board: partitionClassCategories(linksResult.data ?? []),
  };
}

export async function saveClassFollowUpForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<{ success: true; message: string } | MutationFailure> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = saveClassFollowUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const classRow = await getClassForManager(
    adminClient,
    actorUserId,
    parsed.data.class_id
  );
  if (!classRow) {
    return { success: false, error: "Class not found." };
  }

  const allIds = [
    ...new Set([
      ...parsed.data.in_progress_category_ids,
      ...parsed.data.done_category_ids,
    ]),
  ];

  if (allIds.length > 0) {
    const { data, error } = await categoryRepository.findCategoriesByIds(
      adminClient,
      allIds
    );
    if (error) {
      return { success: false, error: error.message };
    }
    if ((data ?? []).length !== allIds.length) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          in_progress_category_ids: [
            "One or more categories were not found.",
          ],
        },
      };
    }
  }

  const { error: deleteError } =
    await classCategoryRepository.deleteClassCategoriesByClassId(
      adminClient,
      parsed.data.class_id
    );
  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const rows = [
    ...parsed.data.in_progress_category_ids.map((category_id) => ({
      class_id: parsed.data.class_id,
      category_id,
      status: CLASS_CATEGORY_STATUSES.IN_PROGRESS,
    })),
    ...parsed.data.done_category_ids.map((category_id) => ({
      class_id: parsed.data.class_id,
      category_id,
      status: CLASS_CATEGORY_STATUSES.DONE,
    })),
  ];

  const { error: insertError } =
    await classCategoryRepository.insertClassCategories(adminClient, rows);
  if (insertError) {
    return { success: false, error: insertError.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "class_categories",
    record_id: parsed.data.class_id,
    new_data: {
      in_progress_category_ids: parsed.data.in_progress_category_ids,
      done_category_ids: parsed.data.done_category_ids,
    },
    metadata: { note: "Class category follow-up saved." },
  });

  return { success: true, message: "Category follow-up was saved." };
}
