import "server-only";

import { cache } from "react";
import { CLASS_STATUSES, type ClassStatusValue } from "@/lib/constants/manager-class-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  computeClassTaskGradeSummary,
  type ClassTaskGradeSummary,
} from "@/lib/manager/class-task-grade-summary";
import {
  getCachedTeachingClassesList,
  setCachedTeachingClassesList,
} from "@/lib/teacher/teaching-classes-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import * as attendeeRepository from "@/repositories/attendee.repository";
import type { AttendeeRecord } from "@/repositories/attendee.repository";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import type { StudentTaskUploadRecord } from "@/repositories/student-task-upload.repository";
import {
  assertPermission,
  assertPermissions,
} from "@/services/auth/authorization.service";
import { getClassComputedGradeLockState } from "@/services/classes/class-computed-grade-lock.service";
import { loadClassStudentRows } from "@/services/classes/class.service";
import { ensureSessionAttendeesForMembers } from "@/services/classes/session-seed.service";
import {
  buildStudentDisplayByUserId,
  isUuid,
  mapAttendeeStatus,
  mapSessionRecord,
  mapStudentTaskRow,
  mapTaskRecord,
} from "@/services/classes/session-shared";
import { assertTeachingAssignment } from "@/services/classes/teacher-class-scope.service";
import type {
  TeacherClassDetailRow,
  TeacherClassRow,
  TeachingClassPageBundle,
  TeachingClassSessionInlineDetail,
  TeachingClassTaskPageBundle,
} from "@/types/class-teaching";
import type { ManagerStudentTaskUploadRow } from "@/types/manager-class-session-detail";
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

/**
 * Request-deduped + short process TTL so list page RSC and navbar search
 * action share one teaching-class catalog within ~30s.
 */
const loadTeachingClassesForUser = cache(
  async (actorUserId: string): Promise<TeacherClassRow[]> => {
    const cached = getCachedTeachingClassesList<TeacherClassRow>(actorUserId);
    if (cached) {
      return cached;
    }

    const adminClient = createSupabaseAdminClient();
    await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

    const assignments =
      await classTeacherRepository.listClassTeachersByTeacherId(
        adminClient,
        actorUserId
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

    const rows = (classes.data ?? [])
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

    setCachedTeachingClassesList(actorUserId, rows);
    return rows;
  }
);

export async function listTeachingClassesForSelf(
  _adminClient: Supabase,
  actorUserId: string | null
): Promise<TeacherClassRow[]> {
  if (!actorUserId) {
    return [];
  }
  return loadTeachingClassesForUser(actorUserId);
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
  classId: string,
  /** When provided by the class page, skips re-listing class tasks. */
  tasks?: Array<{ id: string; max_grade: number | null }>
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

  let taskRows = tasks;
  if (!taskRows) {
    const tasksResult = await classTaskRepository.listClassTasksByClassId(
      adminClient,
      classId
    );
    if (tasksResult.error) {
      throw new Error(tasksResult.error.message);
    }
    taskRows = (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      max_grade: task.max_grade,
    }));
  }

  return buildTaskGradeSummaryForTasks(adminClient, taskRows);
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
  // manager-path re-asserts and unused teacher-count query.
  const [classDetailResult, sessionsResult, tasksResult, students, gradeLock] =
    await Promise.all([
      classRepository.findClassDetailById(adminClient, classId),
      sessionRepository.listSessionsByClassId(adminClient, classId),
      classTaskRepository.listClassTasksByClassId(adminClient, classId),
      // Skip Auth Admin email fan-out; teacher roster uses the student name.
      loadClassStudentRows(adminClient, classId, {
        includeAuthEmails: false,
      }),
      getClassComputedGradeLockState(adminClient, classId),
    ]);

  if (classDetailResult.error) {
    throw new Error(classDetailResult.error.message);
  }

  if (!classDetailResult.data) {
    return null;
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const detail = classDetailResult.data as ClassDetailRecord;
  const classRow: TeacherClassDetailRow = {
    id: detail.id,
    name: detail.name,
    subject_name: detail.subjects?.name ?? "—",
    has_subject: Boolean(detail.subject_id),
    status: mapClassStatus(detail.status),
    semester_name: detail.semesters?.name ?? null,
    enrollment_count: students.length,
    image_url: detail.image_url,
    card_gradient: detail.card_gradient,
  };

  const tasks = (tasksResult.data ?? []).map(mapTaskRecord);

  // Teachers get the student name (not Auth email); omit phone from RSC payload.
  const teacherStudents = students.map((student) => ({
    ...student,
    email: "",
    phone: null,
  }));

  return {
    classRow,
    sessions: (sessionsResult.data ?? []).map(mapSessionRecord),
    tasks,
    students: teacherStudents,
    assignedAt: assignment.assignedAt,
    hasComputedGrades: gradeLock.hasComputedGrades,
    lockedUserIds: gradeLock.lockedUserIds,
  };
}

/**
 * Teacher task detail: profiles only (no Auth email fan-out), plus grade lock.
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

  if (!isUuid(classId) || !isUuid(taskId)) {
    return null;
  }

  const assignment = await assertTeachingAssignment(
    adminClient,
    actorUserId,
    classId
  );

  if (!assignment.ok) {
    return null;
  }

  const [taskResult, classResult, gradeLock] = await Promise.all([
    classTaskRepository.findClassTaskById(adminClient, taskId),
    classRepository.findClassById(adminClient, classId),
    getClassComputedGradeLockState(adminClient, classId),
  ]);

  if (taskResult.error) {
    throw new Error(taskResult.error.message);
  }
  if (classResult.error) {
    throw new Error(classResult.error.message);
  }

  if (
    !taskResult.data ||
    !classResult.data ||
    taskResult.data.class_id !== classId
  ) {
    return null;
  }

  const studentTasksResult =
    await studentTaskRepository.listStudentTasksByTaskId(adminClient, taskId);

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  const studentTaskRecords = (studentTasksResult.data ??
    []) as StudentTaskRecord[];
  const studentTaskIds = studentTaskRecords.map((row) => row.id);

  const [displayByUserId, uploadsResult] = await Promise.all([
    buildStudentDisplayByUserId(
      adminClient,
      studentTaskRecords.map((row) => row.student_id),
      { includeAuthEmails: false }
    ),
    studentTaskUploadRepository.listStudentTaskUploadsByStudentTaskIds(
      adminClient,
      studentTaskIds
    ),
  ]);

  if (uploadsResult.error) {
    throw new Error(uploadsResult.error.message);
  }

  const uploads: ManagerStudentTaskUploadRow[] = (
    (uploadsResult.data ?? []) as StudentTaskUploadRecord[]
  ).map((row) => ({
    id: row.id,
    student_task_id: row.student_task_id,
    file_name: row.file_name,
    mime_type: row.mime_type,
    file_size: row.file_size,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  }));

  return {
    task: mapTaskRecord(taskResult.data as ClassTaskRecord),
    classRow: {
      id: classResult.data.id,
      name: classResult.data.name,
    },
    studentTasks: studentTaskRecords.map((row) =>
      mapStudentTaskRow(row, displayByUserId)
    ),
    uploads,
    hasComputedGrades: gradeLock.hasComputedGrades,
    lockedUserIds: gradeLock.lockedUserIds,
  };
}

/**
 * Lean session open for the teacher Sessions tab: attendees only.
 * Skips manager path (class row, all semesters, Auth emails, grade lock).
 * Locks come from the page bundle.
 */
export async function getTeachingClassSessionInlineDetailForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  sessionId: string
): Promise<TeachingClassSessionInlineDetail | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);

  if (!isUuid(classId) || !isUuid(sessionId)) {
    return null;
  }

  const assignment = await assertTeachingAssignment(
    adminClient,
    actorUserId,
    classId
  );

  if (!assignment.ok) {
    return null;
  }

  const sessionResult = await sessionRepository.findSessionById(
    adminClient,
    sessionId
  );

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  if (!sessionResult.data || sessionResult.data.class_id !== classId) {
    return null;
  }

  await ensureSessionAttendeesForMembers(adminClient, sessionId, classId);

  const attendeesResult = await attendeeRepository.listAttendeesBySessionId(
    adminClient,
    sessionId
  );

  if (attendeesResult.error) {
    throw new Error(attendeesResult.error.message);
  }

  const attendeeRecords = (attendeesResult.data ?? []) as AttendeeRecord[];
  const studentIds = attendeeRecords.map((row) => row.student_id);
  const profilesResult =
    await studentProfileRepository.listStudentProfilesByUserIds(
      adminClient,
      studentIds
    );

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const nameByUserId = new Map(
    (profilesResult.data ?? []).map((row) => [row.user_id, row.full_name])
  );

  return {
    session: mapSessionRecord(sessionResult.data as SessionRecord),
    attendees: attendeeRecords.map((row) => ({
      id: row.id,
      session_id: row.session_id,
      student_id: row.student_id,
      full_name: nameByUserId.get(row.student_id) ?? "Unknown student",
      // Attendance UI does not display email; skip Auth Admin fan-out.
      email: "",
      status: mapAttendeeStatus(row.status),
      created_at: row.created_at,
    })),
  };
}
