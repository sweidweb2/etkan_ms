import { CLASS_STATUSES, type ClassStatusValue } from "@/lib/constants/manager-class-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import type { TeacherClassRow } from "@/types/teacher-class";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function mapClassStatus(status: string | null): ClassStatusValue {
  if (
    status === CLASS_STATUSES.SCHEDULED ||
    status === CLASS_STATUSES.IN_PROGRESS ||
    status === CLASS_STATUSES.DONE ||
    status === CLASS_STATUSES.PAUSED ||
    status === CLASS_STATUSES.STOPPED
  ) {
    return status;
  }

  return CLASS_STATUSES.SCHEDULED;
}

export async function listTeachingClassesForSelf(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<TeacherClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const assignments = await classTeacherRepository.listClassTeachersByTeacherId(
    adminClient,
    actorUserId!
  );

  if (assignments.error) {
    throw new Error(assignments.error.message);
  }

  const assignedAtByClassId = new Map<string, string | null>();
  for (const row of assignments.data ?? []) {
    if (!assignedAtByClassId.has(row.class_id)) {
      assignedAtByClassId.set(row.class_id, row.assigned_at);
    }
  }

  const classes = await classRepository.listClassesWithSubjectByIds(
    adminClient,
    [...assignedAtByClassId.keys()]
  );

  if (classes.error) {
    throw new Error(classes.error.message);
  }

  return (classes.data ?? [])
    .map((classRow) => ({
      id: classRow.id,
      name: classRow.name,
      subject_name: classRow.subjects?.name ?? "Subject",
      class_status: mapClassStatus(classRow.status),
      image_url: classRow.image_url,
      assigned_at: assignedAtByClassId.get(classRow.id) ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
