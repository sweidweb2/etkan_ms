import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { assignClassTeacherSchema } from "@/lib/validators/manager/assign-class-teacher";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as profileRepository from "@/repositories/profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { ManagerClassTeacherOption } from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";
import {
  loadClassDetailCounts,
  mapClassDetailToRowWithCounts,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";

export type AssignClassTeacherResult =
  | {
      success: true;
      teacher: ManagerClassTeacherOption;
      classRow: ManagerClassRow;
      message: string;
    }
  | MutationFailure;

export async function assignTeacherToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { class_id: string; teacher_id: string }
): Promise<AssignClassTeacherResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_ASSIGN_TEACHER);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignClassTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    parsed.data.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const [classResult, teacherResult, counts] = await Promise.all([
    classRepository.findClassDetailById(adminClient, parsed.data.class_id),
    profileRepository.findProfileById(adminClient, parsed.data.teacher_id),
    loadClassDetailCounts(adminClient, parsed.data.class_id),
  ]);

  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }

  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }

  if (teacherResult.error) {
    return { success: false, error: teacherResult.error.message };
  }

  if (!teacherResult.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { teacher_id: ["User not found."] },
    };
  }

  if (!teacherResult.data.is_instructor) {
    return {
      success: false,
      error: "Only instructor profiles can be assigned to a class.",
    };
  }

  const existing = await classTeacherRepository.findClassTeacherByTeacherAndClass(
    adminClient,
    parsed.data.teacher_id,
    parsed.data.class_id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (existing.data) {
    return {
      success: false,
      error: "This teacher is already assigned to the class.",
    };
  }

  const { data, error } = await classTeacherRepository.createClassTeacher(
    adminClient,
    {
      teacher_id: parsed.data.teacher_id,
      class_id: parsed.data.class_id,
      assigned_by: actor.userId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to assign teacher.",
    };
  }

  const classRow = mapClassDetailToRowWithCounts(
    classResult.data as ClassDetailRecord,
    {
      ...counts,
      teacher_count: counts.teacher_count + 1,
    }
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    table_name: "class_teacher",
    record_id: data.id,
    new_data: {
      class_id: data.class_id,
      teacher_id: data.teacher_id,
    },
  });

  return {
    success: true,
    teacher: {
      id: teacherResult.data.id,
      username: teacherResult.data.username,
      assigned: true,
      assignment_id: data.id,
    },
    classRow,
    message: "Teacher assigned to class.",
  };
}

export type UnassignClassTeacherResult =
  | {
      success: true;
      teacherId: string;
      classRow: ManagerClassRow;
      message: string;
    }
  | MutationFailure;

export async function unassignTeacherFromClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { class_id: string; teacher_id: string }
): Promise<UnassignClassTeacherResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_UNASSIGN_TEACHER);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignClassTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    parsed.data.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const [classResult, counts, existing] = await Promise.all([
    classRepository.findClassDetailById(adminClient, parsed.data.class_id),
    loadClassDetailCounts(adminClient, parsed.data.class_id),
    classTeacherRepository.findClassTeacherByTeacherAndClass(
      adminClient,
      parsed.data.teacher_id,
      parsed.data.class_id
    ),
  ]);

  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }

  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Teacher is not assigned to this class." };
  }

  const { error } = await classTeacherRepository.deleteClassTeacherById(
    adminClient,
    existing.data.id
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const classRow = mapClassDetailToRowWithCounts(
    classResult.data as ClassDetailRecord,
    {
      ...counts,
      teacher_count: Math.max(0, counts.teacher_count - 1),
    }
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    table_name: "class_teacher",
    record_id: existing.data.id,
    old_data: {
      class_id: existing.data.class_id,
      teacher_id: existing.data.teacher_id,
    },
  });

  return {
    success: true,
    teacherId: parsed.data.teacher_id,
    classRow,
    message: "Teacher removed from class.",
  };
}
