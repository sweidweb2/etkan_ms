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
  StudentClassmateRow,
} from "@/types/student-class";
import * as profileRepository from "@/repositories/profile.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import type { TaskRecord } from "@/repositories/task.repository";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";
import { listStudentClassAcademicBundlesForSelf } from "@/services/classes/student-course-grade.service";
import { listJoinedClassesForStudentSelf } from "@/services/students/student.service";
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
    starts_at: record.starts_at,
    ends_at: record.ends_at,
    semester_id: record.semester_id,
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

async function listClassmatesForSelf(
  adminClient: Supabase,
  classId: string,
  actorUserId: string
): Promise<StudentClassmateRow[]> {
  const { data: enrollments, error } =
    await studentClassRepository.listStudentClassesByClassId(
      adminClient,
      classId
    );

  if (error) {
    throw new Error(error.message);
  }

  const otherUserIds = (enrollments ?? [])
    .map((row) => row.user_id)
    .filter((id) => id !== actorUserId);

  if (otherUserIds.length === 0) {
    return [];
  }

  const [profilesResult, studentProfilesResult] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, otherUserIds),
    studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      otherUserIds
    ),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }
  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row])
  );
  const studentProfileByUserId = new Map(
    (studentProfilesResult.data ?? []).map((row) => [row.user_id, row])
  );

  const rows: StudentClassmateRow[] = [];
  for (const userId of otherUserIds) {
    const studentProfile = studentProfileByUserId.get(userId);
    const profile = profileById.get(userId);
    if (!studentProfile) {
      continue;
    }
    rows.push({
      full_name: studentProfile.full_name,
      username: profile?.username ?? null,
    });
  }

  rows.sort((left, right) =>
    left.full_name.localeCompare(right.full_name, undefined, {
      sensitivity: "base",
    })
  );

  return rows;
}

/** Class detail for an enrolled student (sessions, academics, classmates). */
export async function getStudentClassDetailForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<StudentClassDetailForSelf | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.ATTENDANCE_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_VIEW);

  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const isMember = await findStudentClassMembership(
    adminClient,
    userId,
    classId
  );
  if (!isMember) {
    return null;
  }

  const joinedClasses = await listJoinedClassesForStudentSelf(
    adminClient,
    userId
  );
  const classRow = joinedClasses.find((row) => row.class_id === classId);
  if (!classRow) {
    return null;
  }

  const [bundles, sessionsResult, classmates] = await Promise.all([
    listStudentClassAcademicBundlesForSelf(adminClient, userId, [classRow]),
    sessionRepository.listSessionsByClassId(adminClient, classId),
    listClassmatesForSelf(adminClient, classId, userId),
  ]);

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  const bundle = bundles[0];
  if (!bundle) {
    return null;
  }

  const sessions = ((sessionsResult.data ?? []) as SessionRecord[])
    .map(mapSessionRecord)
    .sort((left, right) => left.nb_order - right.nb_order);

  return {
    classRow: bundle.classRow,
    sessions,
    detail: bundle.detail,
    classmates,
    finalExam: bundle.finalExam,
    studentFinalExamGrade: bundle.studentFinalExamGrade,
  };
}

/** Task detail + own grade for an enrolled student. */
export async function getStudentClassTaskForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  taskId: string
): Promise<StudentClassTaskDetailForSelf | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const isMember = await findStudentClassMembership(
    adminClient,
    userId,
    classId
  );
  if (!isMember) {
    return null;
  }

  const joinedClasses = await listJoinedClassesForStudentSelf(
    adminClient,
    userId
  );
  const classRow = joinedClasses.find((row) => row.class_id === classId);
  if (!classRow) {
    return null;
  }

  const { data: task, error: taskError } = await taskRepository.findTaskById(
    adminClient,
    taskId
  );

  if (taskError) {
    throw new Error(taskError.message);
  }

  if (!task) {
    return null;
  }

  const taskRecord = task as TaskRecord;
  let sessionLabel: string | null = null;

  if (taskRecord.session_id) {
    const { data: session, error: sessionError } =
      await sessionRepository.findSessionById(
        adminClient,
        taskRecord.session_id
      );

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session || session.class_id !== classId) {
      return null;
    }

    sessionLabel = `S${session.nb_order}`;
  } else {
    return null;
  }

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
      session_id: taskRecord.session_id,
      session_label: sessionLabel,
      title: taskRecord.title,
      description: taskRecord.description,
      due_date: taskRecord.due_date,
      max_grade: Number(taskRecord.max_grade ?? 0),
    },
    studentTask: studentTaskRecord
      ? {
          status: mapStudentTaskStatus(studentTaskRecord.status),
          grade:
            studentTaskRecord.grade == null
              ? null
              : Number(studentTaskRecord.grade),
          submitted_at: studentTaskRecord.submitted_at,
          graded_at: studentTaskRecord.graded_at,
        }
      : null,
  };
}
