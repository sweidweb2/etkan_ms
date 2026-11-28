import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
} from "@/services/auth/authorization.service";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  ManagerClassTeacherOption,
  ManagerClassTeacherSelectOption,
} from "@/types/manager-class-detail";
import {
  isUuid,
  mapSessionRecord,
  type Supabase,
} from "@/services/classes/class-shared";

export async function listTeacherOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassTeacherSelectOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const teachersResult =
    await profileRepository.listTeacherProfileOptions(adminClient);

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  return (teachersResult.data ?? []).map((teacher) => ({
    id: teacher.id,
    full_name: teacher.full_name,
  }));
}

export async function listClassTeacherOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassTeacherOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  if (!isUuid(classId)) {
    return [];
  }

  const [teachers, assignmentsResult] = await Promise.all([
    listTeacherOptionsForManager(adminClient, actorUserId),
    classTeacherRepository.listClassTeachersByClassId(adminClient, classId),
  ]);

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const assignmentByTeacherId = new Map(
    (assignmentsResult.data ?? []).map((row) => [row.teacher_id, row.id])
  );

  const knownIds = new Set(teachers.map((teacher) => teacher.id));
  const missingAssignedIds = [...assignmentByTeacherId.keys()].filter(
    (teacherId) => !knownIds.has(teacherId)
  );

  let assignedOutsideCatalog: ManagerClassTeacherSelectOption[] = [];
  if (missingAssignedIds.length > 0) {
    const extraResult = await profileRepository.listProfileOptionsByIds(
      adminClient,
      missingAssignedIds
    );

    if (extraResult.error) {
      throw new Error(extraResult.error.message);
    }

    assignedOutsideCatalog = (extraResult.data ?? []).map((teacher) => ({
      id: teacher.id,
      full_name: teacher.full_name,
    }));
  }

  return [...teachers, ...assignedOutsideCatalog].map((teacher) => ({
    id: teacher.id,
    full_name: teacher.full_name,
    assigned: assignmentByTeacherId.has(teacher.id),
    assignment_id: assignmentByTeacherId.get(teacher.id) ?? null,
  }));
}

/** Slim id/name options for transfer dialogs (no enrollment/teacher/session counts). */
export async function listClassTransferOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  excludeClassId: string
): Promise<Array<{ id: string; name: string }>> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const { data, error } =
    await classRepository.listClassesWithSubjectForPicker(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => row.id !== excludeClassId)
    .map((row) => ({ id: row.id, name: row.name }));
}

/**
 * Assigned teachers only — for class detail shell before the assign dropdown opens.
 * Callers that already asserted `CLASSES_VIEW` in this request may use
 * `loadAssignedClassTeachers` instead.
 */
export async function listAssignedClassTeachersForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassTeacherOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  return loadAssignedClassTeachers(adminClient, classId);
}

/** Same as `listAssignedClassTeachersForManager` without the permission check. */
export async function loadAssignedClassTeachers(
  adminClient: Supabase,
  classId: string
): Promise<ManagerClassTeacherOption[]> {
  if (!isUuid(classId)) {
    return [];
  }

  const assignmentsResult =
    await classTeacherRepository.listClassTeachersByClassId(
      adminClient,
      classId
    );

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const assignments = assignmentsResult.data ?? [];
  if (assignments.length === 0) {
    return [];
  }

  const teacherIds = assignments.map((row) => row.teacher_id);
  const profilesResult = await profileRepository.listProfileOptionsByIds(
    adminClient,
    teacherIds
  );

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row])
  );
  const assignmentByTeacherId = new Map(
    assignments.map((row) => [row.teacher_id, row.id])
  );

  return teacherIds.flatMap((teacherId) => {
    const profile = profileById.get(teacherId);
    if (!profile) {
      return [];
    }
    return [
      {
        id: profile.id,
        full_name: profile.full_name,
        assigned: true,
        assignment_id: assignmentByTeacherId.get(teacherId) ?? null,
      },
    ];
  });
}

export async function listClassSessionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassSessionRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);
  return loadClassSessions(adminClient, classId);
}

/** Same as `listClassSessionsForManager` without the permission check. */
export async function loadClassSessions(
  adminClient: Supabase,
  classId: string
): Promise<ManagerClassSessionRow[]> {
  const { data, error } = await sessionRepository.listSessionsByClassId(
    adminClient,
    classId
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapSessionRecord(row as SessionRecord));
}
