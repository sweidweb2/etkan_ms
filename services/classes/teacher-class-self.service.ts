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
import {
  assertPermission,
  assertPermissions,
} from "@/services/auth/authorization.service";
import { getClassComputedGradeLockState } from "@/services/classes/class-computed-grade-lock.service";
import { loadClassStudentRows } from "@/services/classes/class.service";
import { mapClassDetailRecordToRow } from "@/services/classes/class-shared";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import {
  mapSessionRecord,
  mapTaskRecord,
} from "@/services/classes/session-shared";
import {
  getClassTaskDetailForManager,
  getSessionDetailForManager,
} from "@/services/classes/session-queries.service";
import {
  assertTeachingAssignment,
} from "@/services/classes/teacher-class-scope.service";
import type {
  TeacherClassDetail,
  TeacherClassRow,
  TeachingClassPageBundle,
  TeachingClassSessionInlineDetail,
  TeachingClassTaskPageBundle,
} from "@/types/class-teaching";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export {
  assertAssignedTeacherForClassMutation,
  assertTeachingAssignment,
} from "@/services/classes/teacher-class-scope.service";

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
  await assertPermissions(adminClient, actorUserId, [
    PERMISSIONS.CLASSES_VIEW,
    PERMISSIONS.SESSIONS_VIEW,
    PERMISSIONS.TASKS_VIEW,
  ]);

  const assignment = await assertTeachingAssignment(
    adminClient,
    actorUserId,
    classId
  );

  if (!assignment.ok) {
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
      assigned_at: assignment.assignedAt,
    },
    sessions: (sessionsResult.data ?? []).map(mapSessionRecord),
    tasks: (tasksResult.data ?? []).map(mapTaskRecord),
  };
}

async function buildTaskGradeSummaryForTasks(
  adminClient: Supabase,
  tasks: Array<{ id: string; max_grade: number | null }>
): Promise<ClassTaskGradeSummary> {
  const taskIds = tasks.map((task) => task.id);
  const studentTasksResult =
    await studentTaskRepository.listStudentTasksByTaskIds(adminClient, taskIds);

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  return computeClassTaskGradeSummary({
    tasks,
    studentTasks: (studentTasksResult.data ?? []).map((row) => ({
      task_id: row.task_id,
      student_id: row.student_id,
      grade: row.grade,
    })),
  });
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
  await assertPermissions(adminClient, actorUserId, [
    PERMISSIONS.CLASSES_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.GRADES_VIEW,
  ]);

  const assignment = await assertTeachingAssignment(
    adminClient,
    actorUserId,
    classId
  );

  if (!assignment.ok) {
    return null;
  }

  const tasksResult = await classTaskRepository.listClassTasksByClassId(
    adminClient,
    classId
  );

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  return buildTaskGradeSummaryForTasks(
    adminClient,
    (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      max_grade: task.max_grade,
    }))
  );
}

/**
 * One assignment check + one parallel wave for the teacher class detail page.
 */
export async function getTeachingClassPageBundleForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<TeachingClassPageBundle | null> {
  await assertPermissions(adminClient, actorUserId, [
    PERMISSIONS.CLASSES_VIEW,
    PERMISSIONS.SESSIONS_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.GRADES_VIEW,
  ]);

  const assignment = await assertTeachingAssignment(
    adminClient,
    actorUserId,
    classId
  );

  if (!assignment.ok) {
    return null;
  }

  // Permissions + teaching assignment are already proven above, so skip the
  // manager-path re-asserts and the extra count queries in `getClassForManager`
  // (enrollment / session counts are derived from rows we already load).
  const [
    classDetailResult,
    teacherCountResult,
    sessionsResult,
    tasksResult,
    students,
    gradeLock,
  ] = await Promise.all([
    classRepository.findClassDetailById(adminClient, classId),
    classTeacherRepository.countClassTeachersByClassId(adminClient, classId),
    sessionRepository.listSessionsByClassId(adminClient, classId),
    classTaskRepository.listClassTasksByClassId(adminClient, classId),
    loadClassStudentRows(adminClient, classId),
    getClassComputedGradeLockState(adminClient, classId),
  ]);

  if (classDetailResult.error) {
    throw new Error(classDetailResult.error.message);
  }

  if (!classDetailResult.data) {
    return null;
  }

  if (teacherCountResult.error) {
    throw new Error(teacherCountResult.error.message);
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const classRow = mapClassDetailRecordToRow(
    classDetailResult.data as ClassDetailRecord,
    {
      enrollment_count: students.length,
      teacher_count: teacherCountResult.count ?? 0,
      completed_sessions: sessionsResult.data?.length ?? 0,
    }
  );

  const tasks = (tasksResult.data ?? []).map(mapTaskRecord);

  return {
    classRow,
    sessions: (sessionsResult.data ?? []).map(mapSessionRecord),
    tasks,
    students,
    assignedAt: assignment.assignedAt,
    hasComputedGrades: gradeLock.hasComputedGrades,
    lockedUserIds: gradeLock.lockedUserIds,
  };
}

/**
 * Lightweight assignment + task detail for the teacher task page.
 */
export async function getTeachingClassTaskPageBundleForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  taskId: string
): Promise<TeachingClassTaskPageBundle | null> {
  await assertPermissions(adminClient, actorUserId, [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.GRADES_VIEW,
  ]);

  const assignment = await assertTeachingAssignment(
    adminClient,
    actorUserId,
    classId
  );

  if (!assignment.ok) {
    return null;
  }

  const [detail, gradeLock] = await Promise.all([
    getClassTaskDetailForManager(adminClient, actorUserId, classId, taskId),
    getClassComputedGradeLockState(adminClient, classId),
  ]);

  if (!detail) {
    return null;
  }

  return {
    task: detail.task,
    classRow: detail.classRow,
    studentTasks: detail.studentTasks,
    uploads: detail.uploads,
    hasComputedGrades: gradeLock.hasComputedGrades,
    lockedUserIds: gradeLock.lockedUserIds,
  };
}

/**
 * Lightweight assignment + session detail for the teacher Sessions tab.
 */
export async function getTeachingClassSessionInlineDetailForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  sessionId: string
): Promise<TeachingClassSessionInlineDetail | null> {
  await assertPermissions(adminClient, actorUserId, [
    PERMISSIONS.SESSIONS_VIEW,
    PERMISSIONS.GRADES_VIEW,
  ]);

  const assignment = await assertTeachingAssignment(
    adminClient,
    actorUserId,
    classId
  );

  if (!assignment.ok) {
    return null;
  }

  const [detail, gradeLock] = await Promise.all([
    getSessionDetailForManager(adminClient, actorUserId, classId, sessionId),
    getClassComputedGradeLockState(adminClient, classId),
  ]);

  if (!detail) {
    return null;
  }

  return {
    session: detail.session,
    attendees: detail.attendees,
    lockedUserIds: gradeLock.lockedUserIds,
    hasComputedGrades: gradeLock.hasComputedGrades,
  };
}
