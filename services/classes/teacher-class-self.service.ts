import "server-only";

import { CLASS_STATUSES, type ClassStatusValue } from "@/lib/constants/manager-class-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  computeClassTaskGradeSummary,
  type ClassTaskGradeSummary,
} from "@/lib/manager/class-task-grade-summary";
import * as classRepository from "@/repositories/class.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import {
  mapSessionRecord,
  mapTaskRecord,
} from "@/services/classes/session-shared";
import type {
  TeacherClassDetail,
  TeacherClassRow,
} from "@/types/teacher-class";
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
      card_gradient: classRow.card_gradient,
      assigned_at: assignedAtByClassId.get(classRow.id) ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getTeachingClassDetailForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<TeacherClassDetail | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW);

  if (!actorUserId) {
    return null;
  }

  const assignment =
    await classTeacherRepository.findClassTeacherByTeacherAndClass(
      adminClient,
      actorUserId,
      classId
    );

  if (assignment.error) {
    throw new Error(assignment.error.message);
  }

  if (!assignment.data) {
    return null;
  }

  const [classes, sessionsResult, tasksResult] = await Promise.all([
    classRepository.listClassesWithSubjectByIds(adminClient, [classId]),
    sessionRepository.listSessionsByClassId(adminClient, classId),
    classTaskRepository.listClassTasksByClassId(adminClient, classId),
  ]);

  if (classes.error) {
    throw new Error(classes.error.message);
  }
  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }
  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const classRow = classes.data?.[0];
  if (!classRow) {
    return null;
  }

  return {
    classRow: {
      id: classRow.id,
      name: classRow.name,
      subject_name: classRow.subjects?.name ?? "Subject",
      class_status: mapClassStatus(classRow.status),
      image_url: classRow.image_url,
      card_gradient: classRow.card_gradient,
      assigned_at: assignment.data.assigned_at,
    },
    sessions: (sessionsResult.data ?? []).map(mapSessionRecord),
    tasks: (tasksResult.data ?? []).map(mapTaskRecord),
  };
}

/**
 * Average of each student's total task grades vs sum of task max grades
 * for a class the teacher is assigned to.
 */
export async function getTeachingClassTaskGradeSummaryForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ClassTaskGradeSummary | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  if (!actorUserId) {
    return null;
  }

  const assignment =
    await classTeacherRepository.findClassTeacherByTeacherAndClass(
      adminClient,
      actorUserId,
      classId
    );

  if (assignment.error) {
    throw new Error(assignment.error.message);
  }

  if (!assignment.data) {
    return null;
  }

  const tasksResult = await classTaskRepository.listClassTasksByClassId(
    adminClient,
    classId
  );

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const tasks = tasksResult.data ?? [];
  const taskIds = tasks.map((task) => task.id);
  const studentTasksResult =
    await studentTaskRepository.listStudentTasksByTaskIds(adminClient, taskIds);

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  return computeClassTaskGradeSummary({
    tasks: tasks.map((task) => ({
      id: task.id,
      max_grade: task.max_grade,
    })),
    studentTasks: (studentTasksResult.data ?? []).map((row) => ({
      task_id: row.task_id,
      student_id: row.student_id,
      grade: row.grade,
    })),
  });
}
