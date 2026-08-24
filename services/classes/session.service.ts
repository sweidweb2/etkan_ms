import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  ATTENDEE_STATUSES,
  type AttendeeStatusValue,
} from "@/lib/constants/manager-attendee-status";
import {
  STUDENT_TASK_STATUSES,
  type StudentTaskStatusValue,
} from "@/lib/constants/manager-student-task-status";
import { createSessionTaskSchema } from "@/lib/validators/manager/create-session-task";
import { updateSessionTaskSchema } from "@/lib/validators/manager/update-session-task";
import { createEditStudentTaskSchema } from "@/lib/validators/manager/edit-student-task";
import { updateAttendeeSchema } from "@/lib/validators/manager/update-attendee";
import { updateClassSessionSchema } from "@/lib/validators/manager/update-class-session";
import { updateSessionSettingsSchema } from "@/lib/validators/manager/update-session-settings";
import { datetimeLocalToUtcIso } from "@/lib/utils/datetime-local-to-utc-iso";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as attendeeRepository from "@/repositories/attendee.repository";
import type { AttendeeRecord } from "@/repositories/attendee.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import type { TaskRecord } from "@/repositories/task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertClassStructureUnlockedForComputedGrades,
  assertStudentGradeInputsUnlockedForComputedGrade,
} from "@/services/classes/class-computed-grade-lock.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  ManagerSessionAttendeeRow,
  ManagerSessionTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";
import {
  SESSION_GROUP_GRADE_LEVELS,
  type SessionGroupGradeLevelValue,
} from "@/types/manager-session-group-grade";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { z } from "zod";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toIsoOrNull(value?: string | null): string | null {
  return datetimeLocalToUtcIso(value);
}

function parseTaskMaxGrade(
  value: string | number | undefined | ""
): number | null {
  if (value === "" || value === undefined) {
    return null;
  }
  return Number(value);
}

function didTaskMaxGradeDecrease(
  previousMaxGrade: number | null,
  nextMaxGrade: number | null
): boolean {
  if (previousMaxGrade == null || nextMaxGrade == null) {
    return false;
  }
  return nextMaxGrade < previousMaxGrade;
}

function mapGroupGradeLevel(
  value: string | null
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

function mapTaskRecord(record: TaskRecord): ManagerSessionTaskRow {
  return {
    id: record.id,
    session_id: record.session_id ?? "",
    title: record.title,
    description: record.description,
    due_date: record.due_date,
    max_grade: record.max_grade,
    created_at: record.created_at ?? "",
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

function mapAttendeeStatus(status: string): AttendeeStatusValue {
  if (
    status === ATTENDEE_STATUSES.PRESENT ||
    status === ATTENDEE_STATUSES.ABSENT ||
    status === ATTENDEE_STATUSES.LATE ||
    status === ATTENDEE_STATUSES.EXCUSED
  ) {
    return status;
  }

  return ATTENDEE_STATUSES.PRESENT;
}

async function buildStudentDisplayByUserId(
  adminClient: Supabase,
  userIds: string[]
): Promise<
  Map<
    string,
    { full_name: string; email: string; student_profile_id: string | null }
  >
> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<
    string,
    { full_name: string; email: string; student_profile_id: string | null }
  >();

  if (uniqueIds.length === 0) {
    return map;
  }

  const [profilesResult, emailResult] = await Promise.all([
    studentProfileRepository.listStudentProfilesByUserIds(
      adminClient,
      uniqueIds
    ),
    authRepository.listAuthEmailsByIds(adminClient, uniqueIds),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (emailResult.error) {
    throw new Error(emailResult.error.message);
  }

  const emailById = emailResult.data;

  for (const userId of uniqueIds) {
    const profile = (profilesResult.data ?? []).find(
      (row) => row.user_id === userId
    );
    map.set(userId, {
      full_name: profile?.full_name ?? "Unknown student",
      email: emailById.get(userId) ?? "",
      student_profile_id: profile?.id ?? null,
    });
  }

  return map;
}

function mapStudentTaskRow(
  row: StudentTaskRecord,
  displayByUserId: Map<
    string,
    { full_name: string; email: string; student_profile_id: string | null }
  >
): ManagerStudentTaskRow {
  const display = displayByUserId.get(row.student_id);

  return {
    id: row.id,
    task_id: row.task_id,
    student_id: row.student_id,
    student_profile_id: display?.student_profile_id ?? null,
    full_name: display?.full_name ?? "Unknown student",
    status: mapStudentTaskStatus(row.status),
    submitted_at: row.submitted_at,
    grade: row.grade,
    notes: row.notes,
    graded_at: row.graded_at,
  };
}

/**
 * Ensure attendee rows exist for current class members only.
 * Binary membership: any student_class row counts. Does not remove rows for
 * former members — historical attendance remains.
 */
export async function ensureSessionAttendeesForMembers(
  adminClient: Supabase,
  sessionId: string,
  classId: string
): Promise<void> {
  const timer = createNavStepTimer("ensureSessionAttendees");
  try {
    const { error } = await timer.step("rpc", () =>
      attendeeRepository.ensureSessionAttendeesForMembers(
        adminClient,
        sessionId,
        classId
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

/**
 * When a student joins a class late, create absent attendee rows for every
 * existing session they do not already have, with a late-enrollment note.
 */
export async function seedLateJoinAttendeesForStudent(
  adminClient: Supabase,
  classId: string,
  studentUserId: string
): Promise<void> {
  const timer = createNavStepTimer("seedAttendees");
  try {
    const { error } = await timer.step("rpc", () =>
      attendeeRepository.seedLateJoinAttendees(
        adminClient,
        classId,
        studentUserId
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

/**
 * When a student joins a class late, create student_task rows for every
 * existing class task they do not already have.
 * Past-due tasks → missing + grade 0 + late note (mirrors final-exam late join).
 */
export async function seedLateJoinStudentTasksForStudent(
  adminClient: Supabase,
  classId: string,
  studentUserId: string
): Promise<void> {
  const timer = createNavStepTimer("seedTasks");
  try {
    const { error } = await timer.step("rpc", () =>
      studentTaskRepository.seedLateJoinStudentTasks(
        adminClient,
        classId,
        studentUserId
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

export async function seedLateJoinAttendeesForStudents(
  adminClient: Supabase,
  classId: string,
  studentUserIds: string[]
): Promise<void> {
  if (studentUserIds.length === 0) {
    return;
  }

  const timer = createNavStepTimer("seedAttendeesBatch");
  try {
    const { error } = await timer.step("rpc", () =>
      attendeeRepository.seedLateJoinAttendeesForStudents(
        adminClient,
        classId,
        studentUserIds
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

export async function seedLateJoinStudentTasksForStudents(
  adminClient: Supabase,
  classId: string,
  studentUserIds: string[]
): Promise<void> {
  if (studentUserIds.length === 0) {
    return;
  }

  const timer = createNavStepTimer("seedTasksBatch");
  try {
    const { error } = await timer.step("rpc", () =>
      studentTaskRepository.seedLateJoinStudentTasksForStudents(
        adminClient,
        classId,
        studentUserIds
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

export type ManagerSessionDetailBundle = {
  session: ManagerClassSessionRow;
  classRow: Pick<ManagerClassRow, "id" | "name" | "semester_id" | "semester_name">;
  linkedPhase: ManagerSessionPhaseLink | null;
  phaseOptions: ManagerSessionPhaseLink[];
  tasks: ManagerSessionTaskRow[];
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

  const [tasksResult, attendeesResult, semestersResult] = await Promise.all([
    taskRepository.listTasksBySessionId(adminClient, sessionId),
    attendeeRepository.listAttendeesBySessionId(adminClient, sessionId),
    semesterRepository.listSemesters(adminClient),
  ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

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
    tasks: ((tasksResult.data ?? []) as TaskRecord[]).map(mapTaskRecord),
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

export type ManagerSessionTaskDetailBundle = {
  task: ManagerSessionTaskRow;
  session: ManagerClassSessionRow;
  classRow: Pick<ManagerClassRow, "id" | "name">;
  studentTasks: ManagerStudentTaskRow[];
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
    taskRepository.findTaskById(adminClient, taskId),
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
    taskResult.data.session_id !== sessionId
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
  const displayByUserId = await buildStudentDisplayByUserId(
    adminClient,
    studentTaskRecords.map((row) => row.student_id)
  );

  return {
    task: mapTaskRecord(taskResult.data as TaskRecord),
    session: mapSessionRecord(sessionResult.data as SessionRecord),
    classRow: {
      id: classResult.data.id,
      name: classResult.data.name,
    },
    studentTasks: studentTaskRecords.map((row) =>
      mapStudentTaskRow(row, displayByUserId)
    ),
  };
}

export type UpdateSessionSettingsResult =
  | {
      success: true;
      session: ManagerClassSessionRow;
      linkedPhase: ManagerSessionPhaseLink | null;
      message: string;
    }
  | MutationFailure;

export async function updateSessionSettingsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    session_id: string;
    class_id: string;
    semester_id?: string;
    group_grade_level?: string;
  }
): Promise<UpdateSessionSettingsResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SESSIONS_UPDATE_SETTINGS);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateSessionSettingsSchema.safeParse({
    semester_id: input.semester_id,
    group_grade_level: input.group_grade_level,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await sessionRepository.findSessionById(
    adminClient,
    input.session_id
  );

  const structureGuardPromise = assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data || existing.data.class_id !== input.class_id) {
    return { success: false, error: "Session not found." };
  }

  const patch: {
    semester_id?: string | null;
    group_grade_level?: string | null;
  } = {};

  if (parsed.data.semester_id !== undefined) {
    patch.semester_id =
      parsed.data.semester_id === "" ? null : parsed.data.semester_id;
  }

  if (parsed.data.group_grade_level !== undefined) {
    patch.group_grade_level =
      parsed.data.group_grade_level === ""
        ? null
        : parsed.data.group_grade_level;
  }

  if (
    patch.semester_id === undefined &&
    patch.group_grade_level === undefined
  ) {
    return {
      success: false,
      error: "Provide a phase or group grade to update.",
    };
  }

  const structureGuard = await structureGuardPromise;

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  let validatedSemester: { id: string; name: string } | null = null;

  if (patch.semester_id) {
    const semesterResult = await semesterRepository.findSemesterById(
      adminClient,
      patch.semester_id
    );
    if (semesterResult.error) {
      return { success: false, error: semesterResult.error.message };
    }
    if (!semesterResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { semester_id: ["Semester not found."] },
      };
    }
    validatedSemester = {
      id: semesterResult.data.id,
      name: semesterResult.data.name,
    };
  }

  const { data, error } = await sessionRepository.updateSessionSettings(
    adminClient,
    input.session_id,
    patch
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update session settings.",
    };
  }

  const session = mapSessionRecord(data as SessionRecord);
  let linkedPhase: ManagerSessionPhaseLink | null = null;

  if (session.semester_id) {
    if (validatedSemester && validatedSemester.id === session.semester_id) {
      linkedPhase = {
        phase_id: validatedSemester.id,
        phase_name: validatedSemester.name,
      };
    } else {
      const semesterResult = await semesterRepository.findSemesterById(
        adminClient,
        session.semester_id
      );
      if (semesterResult.data) {
        linkedPhase = {
          phase_id: semesterResult.data.id,
          phase_name: semesterResult.data.name,
        };
      }
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "sessions",
    record_id: session.id,
    old_data: {
      semester_id: existing.data.semester_id,
      group_grade_level: existing.data.group_grade_level,
    },
    new_data: {
      semester_id: session.semester_id,
      group_grade_level: session.group_grade_level,
    },
    metadata: { note: "Session settings updated." },
  });

  return {
    success: true,
    session,
    linkedPhase,
    message: "Session settings saved.",
  };
}

export type UpdateClassSessionResult =
  | {
      success: true;
      session: ManagerClassSessionRow;
      message: string;
    }
  | MutationFailure;

export async function updateClassSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    session_id: string;
    class_id: string;
    topic: string;
    starts_at: string;
    ends_at: string;
  }
): Promise<UpdateClassSessionResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SESSIONS_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.session_id) || !isUuid(input.class_id)) {
    return { success: false, error: "Session not found." };
  }

  const parsed = updateClassSessionSchema.safeParse({
    topic: input.topic,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existing, structureGuard] = await Promise.all([
    sessionRepository.findSessionById(adminClient, input.session_id),
    assertClassStructureUnlockedForComputedGrades(adminClient, input.class_id),
  ]);

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data || existing.data.class_id !== input.class_id) {
    return { success: false, error: "Session not found." };
  }

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const startsAt = toIsoOrNull(parsed.data.starts_at);
  const endsAt = toIsoOrNull(parsed.data.ends_at);

  if (!startsAt || !endsAt) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        starts_at: ["Invalid date and time."],
      },
    };
  }

  const { data, error } = await sessionRepository.updateSessionDetails(
    adminClient,
    input.session_id,
    {
      topic: parsed.data.topic.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update session. Please try again.",
    };
  }

  const session = mapSessionRecord(data as SessionRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "sessions",
    record_id: session.id,
    old_data: {
      topic: existing.data.topic,
      starts_at: existing.data.starts_at,
      ends_at: existing.data.ends_at,
    },
    new_data: {
      topic: session.topic,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
    },
    metadata: { note: "Session details updated." },
  });

  return {
    success: true,
    session,
    message: "Session updated.",
  };
}

export type DeleteClassSessionResult =
  | {
      success: true;
      message: string;
      classId: string;
    }
  | MutationFailure;

export async function deleteClassSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  sessionId: string
): Promise<DeleteClassSessionResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SESSIONS_DELETE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(sessionId)) {
    return { success: false, error: "Session not found." };
  }

  const existing = await sessionRepository.findSessionById(
    adminClient,
    sessionId
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to delete session. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Session not found." };
  }

  const session = existing.data;

  const [structureGuard, tasksResult] = await Promise.all([
    assertClassStructureUnlockedForComputedGrades(
      adminClient,
      session.class_id
    ),
    taskRepository.listTasksBySessionId(adminClient, sessionId),
  ]);

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  if (session.group_grade_level) {
    return {
      success: false,
      error: "Clear the session difficulty before deleting.",
    };
  }

  if (tasksResult.error) {
    return {
      success: false,
      error: "Unable to delete session. Please try again.",
    };
  }

  if ((tasksResult.data ?? []).length > 0) {
    return {
      success: false,
      error: "Delete or reassign session tasks before deleting the session.",
    };
  }

  const { error: deleteError } = await sessionRepository.deleteSessionById(
    adminClient,
    sessionId
  );

  if (deleteError) {
    return {
      success: false,
      error: "Unable to delete session. Please try again.",
    };
  }

  const { error: renumberError } =
    await sessionRepository.renumberSessionsAfterDelete(
      adminClient,
      session.class_id
    );

  if (renumberError) {
    return {
      success: false,
      error: "Session deleted, but unable to renumber remaining sessions.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "sessions",
    record_id: sessionId,
    old_data: {
      class_id: session.class_id,
      nb_order: session.nb_order,
      topic: session.topic,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      semester_id: session.semester_id,
      group_grade_level: session.group_grade_level,
    },
    metadata: { note: "Class session deleted." },
  });

  return {
    success: true,
    message: "Session deleted.",
    classId: session.class_id,
  };
}

export type CreateSessionTaskResult =
  | {
      success: true;
      task: ManagerSessionTaskRow;
      studentTasks: ManagerStudentTaskRow[];
      message: string;
    }
  | MutationFailure;

export async function createSessionTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    session_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<CreateSessionTaskResult> {
  const timer = createNavStepTimer("createSessionTask");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.TASKS_CREATE)
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const parsed = createSessionTaskSchema.safeParse({
      title: input.title,
      description: input.description,
      due_date: input.due_date,
      max_grade: input.max_grade,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const sessionResult = await timer.step("session", () =>
      sessionRepository.findSessionById(adminClient, input.session_id)
    );

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    if (!sessionResult.data || sessionResult.data.class_id !== input.class_id) {
      return { success: false, error: "Session not found." };
    }

    const structureGuard = await timer.step("structureGuard", () =>
      assertClassStructureUnlockedForComputedGrades(adminClient, input.class_id)
    );

    if (!structureGuard.ok) {
      return { success: false, error: structureGuard.error };
    }

    const maxGrade =
      parsed.data.max_grade === "" || parsed.data.max_grade === undefined
        ? null
        : Number(parsed.data.max_grade);

    const { data, error } = await timer.step("createTask", () =>
      taskRepository.createTask(adminClient, {
        session_id: input.session_id,
        title: parsed.data.title.trim(),
        description: normalizeOptionalString(parsed.data.description),
        due_date: toIsoOrNull(parsed.data.due_date),
        max_grade: maxGrade,
      })
    );

    if (error || !data) {
      return {
        success: false,
        error: error?.message ?? "Unable to create task.",
      };
    }

    const gradesResult = await timer.step("seedTasks", () =>
      studentTaskRepository.seedStudentTasksForNewTask(adminClient, data.id)
    );

    if (gradesResult.error) {
      return { success: false, error: gradesResult.error.message };
    }

    const studentTaskRecords = gradesResult.data ?? [];
    const displayByUserId = await timer.step("hydrate", () =>
      buildStudentDisplayByUserId(
        adminClient,
        studentTaskRecords.map((row) => row.student_id)
      )
    );

    const task = mapTaskRecord(data as TaskRecord);
    const studentTasks: ManagerStudentTaskRow[] = studentTaskRecords.map((row) =>
      mapStudentTaskRow(row, displayByUserId)
    );

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        severity: "info",
        table_name: "tasks",
        record_id: task.id,
        new_data: {
          session_id: task.session_id,
          title: task.title,
          student_task_count: studentTasks.length,
        },
        metadata: { note: "Session task created with pending student rows." },
      })
    );

    return {
      success: true,
      task,
      studentTasks,
      message: "Task created.",
    };
  } finally {
    timer.end();
  }
}

export type UpdateSessionTaskResult =
  | {
      success: true;
      task: ManagerSessionTaskRow;
      gradesClamped: boolean;
      message: string;
    }
  | MutationFailure;

export async function updateSessionTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    session_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<UpdateSessionTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.id) || !isUuid(input.class_id) || !isUuid(input.session_id)) {
    return { success: false, error: "Task not found." };
  }

  const parsed = updateSessionTaskSchema.safeParse({
    title: input.title,
    description: input.description,
    due_date: input.due_date,
    max_grade: input.max_grade,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingTaskResult, sessionResult] = await Promise.all([
    taskRepository.findTaskById(adminClient, input.id),
    sessionRepository.findSessionById(adminClient, input.session_id),
  ]);

  if (existingTaskResult.error) {
    return { success: false, error: existingTaskResult.error.message };
  }

  if (sessionResult.error) {
    return { success: false, error: sessionResult.error.message };
  }

  const existingTask = existingTaskResult.data;
  const session = sessionResult.data;

  if (
    !existingTask ||
    !session ||
    session.class_id !== input.class_id ||
    existingTask.session_id !== input.session_id
  ) {
    return { success: false, error: "Task not found." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const nextMaxGrade = parseTaskMaxGrade(parsed.data.max_grade);
  const previousMaxGrade = existingTask.max_grade;
  const shouldClampGrades = didTaskMaxGradeDecrease(
    previousMaxGrade,
    nextMaxGrade
  );

  let gradesClamped = false;

  if (shouldClampGrades && nextMaxGrade != null) {
    const clampResult = await studentTaskRepository.clampStudentTaskGradesAboveMax(
      adminClient,
      input.id,
      nextMaxGrade
    );

    if (clampResult.error) {
      return { success: false, error: clampResult.error.message };
    }

    gradesClamped = (clampResult.data?.length ?? 0) > 0;
  }

  const { data, error } = await taskRepository.updateTask(adminClient, input.id, {
    title: parsed.data.title.trim(),
    description: normalizeOptionalString(parsed.data.description),
    due_date: toIsoOrNull(parsed.data.due_date),
    max_grade: nextMaxGrade,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update task.",
    };
  }

  const task = mapTaskRecord(data as TaskRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "tasks",
    record_id: task.id,
    old_data: {
      title: existingTask.title,
      description: existingTask.description,
      due_date: existingTask.due_date,
      max_grade: existingTask.max_grade,
    },
    new_data: {
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      max_grade: task.max_grade,
    },
    metadata: gradesClamped
      ? {
          note: "Task updated; student grades above the new max were clamped.",
        }
      : { note: "Task updated." },
  });

  return {
    success: true,
    task,
    gradesClamped,
    message: "Task updated.",
  };
}

export type DeleteSessionTaskResult =
  | {
      success: true;
      classId: string;
      sessionId: string;
      message: string;
    }
  | MutationFailure;

export async function deleteSessionTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    session_id: string;
  }
): Promise<DeleteSessionTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (
    !isUuid(input.id) ||
    !isUuid(input.class_id) ||
    !isUuid(input.session_id)
  ) {
    return { success: false, error: "Task not found." };
  }

  const [existingTaskResult, sessionResult] = await Promise.all([
    taskRepository.findTaskById(adminClient, input.id),
    sessionRepository.findSessionById(adminClient, input.session_id),
  ]);

  if (existingTaskResult.error) {
    return { success: false, error: existingTaskResult.error.message };
  }

  if (sessionResult.error) {
    return { success: false, error: sessionResult.error.message };
  }

  const existingTask = existingTaskResult.data;
  const session = sessionResult.data;

  if (
    !existingTask ||
    !session ||
    session.class_id !== input.class_id ||
    existingTask.session_id !== input.session_id
  ) {
    return { success: false, error: "Task not found." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const studentTasksResult =
    await studentTaskRepository.deleteStudentTasksByTaskId(
      adminClient,
      input.id
    );

  if (studentTasksResult.error) {
    return { success: false, error: studentTasksResult.error.message };
  }

  const deletedStudentTaskCount = studentTasksResult.data?.length ?? 0;

  const { error: deleteError } = await taskRepository.deleteTaskById(
    adminClient,
    input.id
  );

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message ?? "Unable to delete task.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "tasks",
    record_id: input.id,
    old_data: {
      title: existingTask.title,
      session_id: existingTask.session_id,
      max_grade: existingTask.max_grade,
      student_task_count: deletedStudentTaskCount,
    },
    metadata: {
      note: "Session task deleted with student task rows.",
    },
  });

  return {
    success: true,
    classId: input.class_id,
    sessionId: input.session_id,
    message: "Task deleted.",
  };
}

export type UpdateAttendeeResult =
  | {
      success: true;
      attendee: ManagerSessionAttendeeRow;
      message: string;
    }
  | MutationFailure;

/**
 * Update an existing attendee row. No membership gate: former members keep
 * historical rows and those rows remain editable.
 */
export async function updateAttendeeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    session_id: string;
    status: AttendeeStatusValue;
    note?: string;
  }
): Promise<UpdateAttendeeResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.ATTENDANCE_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateAttendeeSchema.safeParse({
    status: input.status,
    note: input.note,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existing, sessionResult] = await Promise.all([
    attendeeRepository.findAttendeeById(adminClient, input.id),
    sessionRepository.findSessionById(adminClient, input.session_id),
  ]);

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data || existing.data.session_id !== input.session_id) {
    return { success: false, error: "Attendee not found." };
  }

  if (sessionResult.error) {
    return { success: false, error: sessionResult.error.message };
  }

  if (!sessionResult.data || sessionResult.data.class_id !== input.class_id) {
    return { success: false, error: "Session not found." };
  }

  const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
    adminClient,
    input.class_id,
    existing.data.student_id
  );

  if (!studentGuard.ok) {
    return { success: false, error: studentGuard.error };
  }

  const { data, error } = await attendeeRepository.updateAttendee(
    adminClient,
    input.id,
    {
      status: parsed.data.status,
      note:
        parsed.data.note !== undefined
          ? normalizeOptionalString(parsed.data.note)
          : existing.data.note,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update attendance.",
    };
  }

  const displayByUserId = await buildStudentDisplayByUserId(adminClient, [
    data.student_id,
  ]);
  const display = displayByUserId.get(data.student_id);

  const attendee: ManagerSessionAttendeeRow = {
    id: data.id,
    session_id: data.session_id,
    student_id: data.student_id,
    full_name: display?.full_name ?? "Unknown student",
    email: display?.email ?? "",
    note: data.note,
    status: mapAttendeeStatus(data.status),
    created_at: data.created_at,
  };

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "attendee",
    record_id: attendee.id,
    old_data: {
      status: existing.data.status,
      note: existing.data.note,
    },
    new_data: {
      status: attendee.status,
      note: attendee.note,
    },
  });

  return {
    success: true,
    attendee,
    message: "Attendance updated.",
  };
}

export type UpdateStudentTaskResult =
  | {
      success: true;
      studentTask: ManagerStudentTaskRow;
      message: string;
      classId: string | null;
      sessionId: string | null;
    }
  | MutationFailure;

export async function updateStudentTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    status: string;
    grade?: string | number;
    notes?: string;
    submitted_at?: string;
  }
): Promise<UpdateStudentTaskResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.TASKS_UPDATE_STUDENT);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await studentTaskRepository.findStudentTaskById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Student task not found." };
  }

  const taskResult = await taskRepository.findTaskById(
    adminClient,
    existing.data.task_id
  );

  if (taskResult.error) {
    return { success: false, error: taskResult.error.message };
  }

  if (!taskResult.data) {
    return { success: false, error: "Task not found." };
  }

  let classId: string | null = null;
  const sessionId = taskResult.data.session_id;

  if (sessionId) {
    const sessionResult = await sessionRepository.findSessionById(
      adminClient,
      sessionId
    );

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    if (sessionResult.data) {
      classId = sessionResult.data.class_id;
    }
  }

  if (classId) {
    const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
      adminClient,
      classId,
      existing.data.student_id
    );

    if (!studentGuard.ok) {
      return { success: false, error: studentGuard.error };
    }
  }

  const parsed = createEditStudentTaskSchema(
    taskResult.data.max_grade,
    taskResult.data.due_date
  ).safeParse(
    {
      status: input.status,
      grade: input.grade,
      notes: input.notes,
      submitted_at: input.submitted_at,
    }
  );

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const grade =
    parsed.data.grade === "" || parsed.data.grade === undefined
      ? null
      : Number(parsed.data.grade);

  const gradedAt = new Date().toISOString();
  const shouldSetGradedAt =
    grade !== null &&
    (parsed.data.status === STUDENT_TASK_STATUSES.GRADED ||
      parsed.data.status === STUDENT_TASK_STATUSES.LATE);

  const { data, error } = await studentTaskRepository.updateStudentTask(
    adminClient,
    input.id,
    {
      status: parsed.data.status,
      grade,
      notes: normalizeOptionalString(parsed.data.notes),
      submitted_at: toIsoOrNull(parsed.data.submitted_at),
      graded_at: shouldSetGradedAt ? gradedAt : null,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update student task.",
    };
  }

  const displayByUserId = await buildStudentDisplayByUserId(adminClient, [
    data.student_id,
  ]);

  const studentTask = mapStudentTaskRow(
    data as StudentTaskRecord,
    displayByUserId
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_tasks",
    record_id: studentTask.id,
    old_data: {
      status: existing.data.status,
      grade: existing.data.grade,
    },
    new_data: {
      status: studentTask.status,
      grade: studentTask.grade,
    },
  });

  return {
    success: true,
    studentTask,
    message: "Student task updated.",
    classId,
    sessionId,
  };
}
