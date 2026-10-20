import { PERMISSIONS } from "@/lib/constants/permissions";
import { assertPermission } from "@/services/auth/authorization.service";
import * as attendeeRepository from "@/repositories/attendee.repository";
import type { AttendeeRecord } from "@/repositories/attendee.repository";
import * as classRepository from "@/repositories/class.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import type { StudentTaskUploadRecord } from "@/repositories/student-task-upload.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import { ensureSessionAttendeesForMembers } from "@/services/classes/session-seed.service";
import {
  buildStudentDisplayByUserId,
  isUuid,
  mapAttendeeStatus,
  mapSessionRecord,
  mapStudentTaskRow,
  mapTaskRecord,
  type Supabase,
} from "@/services/classes/session-shared";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  ManagerClassTaskRow,
  ManagerSessionAttendeeRow,
  ManagerStudentTaskRow,
  ManagerStudentTaskUploadRow,
} from "@/types/manager-class-session-detail";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

export async function listClassTasksForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassTaskRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW);

  if (!isUuid(classId)) {
    return [];
  }

  const tasksResult = await classTaskRepository.listClassTasksByClassId(
    adminClient,
    classId
  );

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  return ((tasksResult.data ?? []) as ClassTaskRecord[])
    .map(mapTaskRecord)
    .sort((left, right) => {
      const orderCompare = left.sort_order - right.sort_order;
      if (orderCompare !== 0) {
        return orderCompare;
      }

      return (
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      );
    });
}

export type ManagerSessionDetailBundle = {
  session: ManagerClassSessionRow;
  classRow: Pick<ManagerClassRow, "id" | "name" | "semester_id" | "semester_name">;
  linkedPhase: ManagerSessionPhaseLink | null;
  phaseOptions: ManagerSessionPhaseLink[];
  /** @deprecated Sessions no longer own tasks; always empty. */
  tasks: ManagerClassTaskRow[];
  attendees: ManagerSessionAttendeeRow[];
};

export async function getSessionDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  sessionId: string
): Promise<ManagerSessionDetailBundle | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);

  if (!isUuid(classId) || !isUuid(sessionId)) {
    return null;
  }

  const [sessionResult, classResult] = await Promise.all([
    sessionRepository.findSessionById(adminClient, sessionId),
    classRepository.findClassDetailById(adminClient, classId),
  ]);

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  if (classResult.error) {
    throw new Error(classResult.error.message);
  }

  if (
    !sessionResult.data ||
    !classResult.data ||
    sessionResult.data.class_id !== classId
  ) {
    return null;
  }

  await ensureSessionAttendeesForMembers(
    adminClient,
    sessionId,
    classId
  );

  const [attendeesResult, semestersResult] = await Promise.all([
    attendeeRepository.listAttendeesBySessionId(adminClient, sessionId),
    semesterRepository.listSemesters(adminClient),
  ]);

  if (attendeesResult.error) {
    throw new Error(attendeesResult.error.message);
  }

  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }

  const attendeeRecords = (attendeesResult.data ?? []) as AttendeeRecord[];
  const displayByUserId = await buildStudentDisplayByUserId(
    adminClient,
    attendeeRecords.map((row) => row.student_id)
  );

  const session = mapSessionRecord(sessionResult.data as SessionRecord);
  const phaseOptions: ManagerSessionPhaseLink[] = (semestersResult.data ?? []).map(
    (row) => ({
      phase_id: row.id,
      phase_name: row.name,
    })
  );

  const linkedPhase =
    phaseOptions.find((phase) => phase.phase_id === session.semester_id) ?? null;

  return {
    session,
    classRow: {
      id: classResult.data.id,
      name: classResult.data.name,
      semester_id: classResult.data.semester_id,
      semester_name: classResult.data.semesters?.name ?? null,
    },
    linkedPhase,
    phaseOptions,
    tasks: [],
    attendees: attendeeRecords.map((row) => {
      const display = displayByUserId.get(row.student_id);
      return {
        id: row.id,
        session_id: row.session_id,
        student_id: row.student_id,
        full_name: display?.full_name ?? "Unknown student",
        email: display?.email ?? "",
        note: row.note,
        status: mapAttendeeStatus(row.status),
        created_at: row.created_at,
      };
    }),
  };
}

export type ManagerClassTaskDetailBundle = {
  task: ManagerClassTaskRow;
  classRow: Pick<ManagerClassRow, "id" | "name">;
  studentTasks: ManagerStudentTaskRow[];
  uploads: ManagerStudentTaskUploadRow[];
};

/** Class task detail — does not require a session. */
export async function getClassTaskDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  taskId: string
): Promise<ManagerClassTaskDetailBundle | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW);

  if (!isUuid(classId) || !isUuid(taskId)) {
    return null;
  }

  const [taskResult, classResult] = await Promise.all([
    classTaskRepository.findClassTaskById(adminClient, taskId),
    classRepository.findClassById(adminClient, classId),
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

  const studentTasksResult = await studentTaskRepository.listStudentTasksByTaskId(
    adminClient,
    taskId
  );

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  const studentTaskRecords = (studentTasksResult.data ??
    []) as StudentTaskRecord[];
  const studentTaskIds = studentTaskRecords.map((row) => row.id);

  const [displayByUserId, uploadsResult] = await Promise.all([
    buildStudentDisplayByUserId(
      adminClient,
      studentTaskRecords.map((row) => row.student_id)
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
    storage_path: row.storage_path,
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
  };
}

export type ManagerSessionTaskDetailBundle = {
  task: ManagerClassTaskRow;
  session: ManagerClassSessionRow;
  classRow: Pick<ManagerClassRow, "id" | "name">;
  studentTasks: ManagerStudentTaskRow[];
  uploads: ManagerStudentTaskUploadRow[];
};

export async function getSessionTaskDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  sessionId: string,
  taskId: string
): Promise<ManagerSessionTaskDetailBundle | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW);

  if (!isUuid(classId) || !isUuid(sessionId) || !isUuid(taskId)) {
    return null;
  }

  const [taskResult, sessionResult, classResult] = await Promise.all([
    classTaskRepository.findClassTaskById(adminClient, taskId),
    sessionRepository.findSessionById(adminClient, sessionId),
    classRepository.findClassById(adminClient, classId),
  ]);

  if (taskResult.error) {
    throw new Error(taskResult.error.message);
  }

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  if (classResult.error) {
    throw new Error(classResult.error.message);
  }

  if (
    !taskResult.data ||
    !sessionResult.data ||
    !classResult.data ||
    sessionResult.data.class_id !== classId ||
    taskResult.data.class_id !== classId
  ) {
    return null;
  }

  const studentTasksResult = await studentTaskRepository.listStudentTasksByTaskId(
    adminClient,
    taskId
  );

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  const studentTaskRecords = (studentTasksResult.data ??
    []) as StudentTaskRecord[];
  const studentTaskIds = studentTaskRecords.map((row) => row.id);

  const [displayByUserId, uploadsResult] = await Promise.all([
    buildStudentDisplayByUserId(
      adminClient,
      studentTaskRecords.map((row) => row.student_id)
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
    storage_path: row.storage_path,
    file_name: row.file_name,
    mime_type: row.mime_type,
    file_size: row.file_size,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  }));

  return {
    task: mapTaskRecord(taskResult.data as ClassTaskRecord),
    session: mapSessionRecord(sessionResult.data as SessionRecord),
    classRow: {
      id: classResult.data.id,
      name: classResult.data.name,
    },
    studentTasks: studentTaskRecords.map((row) =>
      mapStudentTaskRow(row, displayByUserId)
    ),
    uploads,
  };
}
