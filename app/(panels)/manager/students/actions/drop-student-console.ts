"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerPeopleLists } from "@/lib/cache/manager-list-cache";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseDropAllSemestersFormData } from "@/lib/validators/manager/parse-semester-drop-form";
import { dropAllSemestersForManager } from "@/services/classes/drop-semester.service";
import { getDropStudentConsoleSnapshotForManager } from "@/services/students/drop-student-console.service";
import type { DropAllSemestersActionState } from "@/types/manager-drop-student-console";
import type { DropStudentConsoleSnapshot } from "@/types/manager-drop-student-console";

export async function loadDropStudentConsoleSnapshotAction(
  userId: string
): Promise<
  | { success: true; snapshot: DropStudentConsoleSnapshot }
  | { success: false; error: string }
> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return { success: false, error: "Unauthorized." };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    const snapshot = await getDropStudentConsoleSnapshotForManager(
      adminClient,
      actor.userId,
      userId
    );
    if (!snapshot) {
      return { success: false, error: "Student not found." };
    }
    return { success: true, snapshot };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load drop student console.",
    };
  }
}

export async function dropAllSemestersAction(
  _prevState: DropAllSemestersActionState,
  formData: FormData
): Promise<DropAllSemestersActionState> {
  return runManagerAction({
    formData,
    permission: PERMISSIONS.CLASSES_DROP_SEMESTER,
    parse: parseDropAllSemestersFormData,
    mutate: async ({ adminClient, actor, data }) => {
      const snapshot = await getDropStudentConsoleSnapshotForManager(
        adminClient,
        actor.userId,
        data.student_id
      );
      if (!snapshot) {
        return { success: false as const, error: "Student not found." };
      }

      const targets = snapshot.drop_targets.filter(
        (target) => !target.has_pending_drop
      );
      if (targets.length === 0) {
        return {
          success: false as const,
          error:
            snapshot.drop_targets.length === 0
              ? "No semesters available to drop."
              : "All droppable semesters already have a pending drop. Stop or finish them first.",
        };
      }

      return dropAllSemestersForManager(adminClient, actor.userId, actor, {
        student_id: data.student_id,
        targets: targets.map((target) => ({
          semester_id: target.semester_id,
          semester_name: target.semester_name,
          origin_class_id: target.origin_class_id,
          origin_membership_id: target.origin_membership_id,
        })),
        restriction_mode: data.restriction_mode,
        required_percent: data.required_percent,
        required_amount: data.required_amount,
      });
    },
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_STUDENTS_DROP);
      revalidatePath(ROUTES.MANAGER_STUDENTS);
      revalidatePath(ROUTES.MANAGER_ACCOUNTING);
      revalidateManagerPeopleLists();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      completedCount: result.completedCount,
    }),
  });
}
