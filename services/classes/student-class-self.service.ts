import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  STUDENT_TASK_STATUSES,
  type StudentTaskStatusValue,
} from "@/lib/constants/manager-student-task-status";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";
import { SESSION_GROUP_GRADE_LEVELS } from "@/types/manager-session-group-grade";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type {
  StudentClassDetailForSelf,
  StudentClassTaskDetailForSelf,
} from "@/types/student-class";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import type { StudentTaskUploadRecord } from "@/repositories/student-task-upload.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import {
  assertPermission,
  assertPermissions,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";
import { mapStudentTaskUploadForSelf } from "@/services/classes/student-task-upload-self.service";
import { listStudentClassAcademicBundlesForSelf } from "@/services/classes/student-course-grade.service";
import {
  getJoinedClassForStudentSelf,
  listJoinedClassesForStudentSelf,
} from "@/services/students/student.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function mapGroupGradeLevel(
  value: string | null | undefined
): SessionGroupGradeLevelValue | null {
  if (
    value === SESSION_GROUP_GRADE_LEVELS.VERY_LOW ||
    value === SESSION_GROUP_GRADE_LEVELS.LOW ||
    value === SESSION_GROUP_GRADE_LEVELS.MEDIUM ||
    value === SESSION_GROUP_GRADE_LEVELS.HIGH ||
    value === SESSION_GROUP_GRADE_LEVELS.VERY_HIGH
  ) {
    return value;
  }
  return null;
}

function mapSessionRecord(record: SessionRecord): ManagerClassSessionRow {
  return {
    id: record.id,
    class_id: record.class_id,
    nb_order: record.nb_order,
    topic: record.topic,
    session_report: record.session_report,
    starts_at: record.starts_at,
    ends_at: record.ends_at,
    group_grade_level: mapGroupGradeLevel(record.group_grade_level),
    created_at: record.created_at,
  };
}

function mapStudentTaskStatus(status: string): StudentTaskStatusValue {
  if (
    status === STUDENT_TASK_STATUSES.PENDING ||
    status === STUDENT_TASK_STATUSES.SUBMITTED ||
    status === STUDENT_TASK_STATUSES.GRADED ||
    status === STUDENT_TASK_STATUSES.LATE ||
    status === STUDENT_TASK_STATUSES.MISSING
  ) {
    return status;
  }
  return STUDENT_TASK_STATUSES.PENDING;
}

/** True when actor is enrolled in the class; otherwise null. */
export async function findStudentClassMembership(
  adminClient: Supabase,
  userId: string,
  classId: string
): Promise<boolean> {
  const { data, error } =
    await studentClassRepository.findStudentClassByUserAndClass(
      adminClient,
      userId,
      classId
    );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

/** Enrolled classes for My classes list (`classes.view` + self). */
export async function listJoinedClassesForSelf(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerStudentClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  return listJoinedClassesForStudentSelf(adminClient, actorUserId);
}

/** Class detail for an enrolled student (sessions, academics). */
export async function getStudentClassDetailForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<StudentClassDetailForSelf | null> {
  await assertPermissions(adminClient, actorUserId, [
    PERMISSIONS.CLASSES_VIEW,
    PERMISSIONS.SESSIONS_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.GRADES_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.FINAL_EXAMS_VIEW,
  ]);

  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const classRow = await getJoinedClassForStudentSelf(
    adminClient,
    userId,
    classId
  );
  if (!classRow) {
    return null;
  }

  const [bundles, sessionsResult] = await Promise.all([
    listStudentClassAcademicBundlesForSelf(adminClient, userId, [classRow]),
    sessionRepository.listSessionsByClassId(adminClient, classId),
  ]);

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  const bundle = bundles[0];
  if (!bundle) {
    return null;
  }

  const uploadResult =
    await studentTaskUploadRepository.listStudentTaskUploadsByStudentTaskIds(
      adminClient,
      bundle.detail.tasks.map((task) => task.student_task_id)
    );

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const sessions = ((sessionsResult.data ?? []) as SessionRecord[])
    .map(mapSessionRecord)
    .sort((left, right) => left.nb_order - right.nb_order);

  return {
    classRow: bundle.classRow,
    sessions,
    detail: bundle.detail,
    finalExam: bundle.finalExam,
    studentFinalExamGrade: bundle.studentFinalExamGrade,
    uploads: ((uploadResult.data ?? []) as StudentTaskUploadRecord[]).map(
      mapStudentTaskUploadForSelf
    ),
  };
}

/** Task detail + own grade for an enrolled student. */
export async function getStudentClassTaskForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  taskId: string
): Promise<StudentClassTaskDetailForSelf | null> {
  await assertPermissions(adminClient, actorUserId, [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.GRADES_VIEW,
  ]);

  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const [classRow, taskResult] = await Promise.all([
    getJoinedClassForStudentSelf(adminClient, userId, classId),
    classTaskRepository.findClassTaskById(adminClient, taskId),
  ]);

  if (!classRow) {
    return null;
  }

  const { data: task, error: taskError } = taskResult;

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task || task.class_id !== classId) {
    return null;
  }

  const taskRecord = task as ClassTaskRecord;
  const studentTasksResult =
    await studentTaskRepository.listStudentTasksForGradesByTaskIdsAndStudentId(
      adminClient,
      [taskId],
      userId
    );

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  const studentTaskRecord = (studentTasksResult.data?.[0] ??
    null) as StudentTaskRecord | null;

  return {
    classRow,
    task: {
      id: taskRecord.id,
      session_id: null,
      session_label: null,
      started: taskRecord.started,
      title: taskRecord.title,
      description: taskRecord.description,
      due_date: taskRecord.due_date,
      max_grade: Number(taskRecord.max_grade ?? 0),
      is_yes_no: taskRecord.is_yes_no ?? false,
    },
    studentTask: studentTaskRecord
      ? {
          id: studentTaskRecord.id,
          status: mapStudentTaskStatus(studentTaskRecord.status),
          grade:
            studentTaskRecord.grade == null
              ? null
              : Number(studentTaskRecord.grade),
          submitted_at: studentTaskRecord.submitted_at,
          graded_at: studentTaskRecord.graded_at,
        }
      : null,
    uploads: studentTaskRecord
      ? await listOwnTaskUploads(adminClient, studentTaskRecord.id)
      : [],
  };
}

async function listOwnTaskUploads(adminClient: Supabase, studentTaskId: string) {
  const uploadResult =
    await studentTaskUploadRepository.listStudentTaskUploadsByStudentTaskIds(
      adminClient,
      [studentTaskId]
    );

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  return ((uploadResult.data ?? []) as StudentTaskUploadRecord[]).map(
    mapStudentTaskUploadForSelf
  );
}
