import "server-only";

import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import * as classTaskRepository from "@/repositories/class-task.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import * as attendeeRepository from "@/repositories/attendee.repository";
import type { AttendeeRecord } from "@/repositories/attendee.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  assertStudentSelfAccess,
  getUnauthorizedError,
  hasAnyPermission,
  UNAUTHORIZED_MESSAGE,
} from "@/services/auth/authorization.service";
import { getClassComputedGradeLockState } from "@/services/classes/class-computed-grade-lock.service";
import {
  applyClassTaskStart,
  applyCreateClassTask,
  applyUpdateClassTask,
  type CreateClassTaskInput,
  type CreateClassTaskResult,
  type SetClassTaskStartedResult,
  type UpdateClassTaskInput,
  type UpdateClassTaskResult,
} from "@/services/classes/class-tasks.service";
import { ensureSessionAttendeesForMembers } from "@/services/classes/session-seed.service";
import {
  isUuid,
  mapAttendeeStatus,
  mapTaskRecord,
  type ClassMutationAuthorizer,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/session-shared";
import {
  applyAttendeeUpdate,
  type UpdateAttendeeInput,
  type UpdateAttendeeResult,
} from "@/services/classes/session-tasks.service";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type {
  StudentTeamLeaderBundle,
  TeamLeaderSessionAttendance,
} from "@/types/student-team-leader";

export const TEAM_LEADER_REQUIRED_MESSAGE =
  "Only the team leader of this class can do this.";

const TEAM_LEADER_PERMISSIONS: readonly PermissionKey[] = [
  PERMISSIONS.TEAM_LEADER_ATTENDANCE_UPDATE,
  PERMISSIONS.TEAM_LEADER_TASKS_CREATE,
  PERMISSIONS.TEAM_LEADER_TASKS_UPDATE,
  PERMISSIONS.TEAM_LEADER_TASKS_START,
];

type GateResult = { ok: true; userId: string } | { ok: false; error: string };

/**
 * Team-leader gate: the role permission AND the actor's own enrollment row in
 * this class with `is_team_leader = true`. Either alone grants nothing.
 */
export async function assertTeamLeaderForClass(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  permission: PermissionKey
): Promise<GateResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    permission
  );
  if (unauthorized || !actorUserId) {
    return { ok: false, error: unauthorized ?? UNAUTHORIZED_MESSAGE };
  }

  try {
    await assertStudentSelfAccess(adminClient, actorUserId);
  } catch {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }

  if (!isUuid(classId)) {
    return { ok: false, error: TEAM_LEADER_REQUIRED_MESSAGE };
  }

  const membership = await studentClassRepository.findStudentClassByUserAndClass(
    adminClient,
    actorUserId,
    classId
  );
  if (membership.error) {
    return { ok: false, error: membership.error.message };
  }
  if (!membership.data?.is_team_leader) {
    return { ok: false, error: TEAM_LEADER_REQUIRED_MESSAGE };
  }

  return { ok: true, userId: actorUserId };
}

/** The gate already ran for `classId`; only confirm the core resolved the same class. */
function sameClassAuthorizer(classId: string): ClassMutationAuthorizer {
  return async (resolvedClassId) =>
    resolvedClassId === classId
      ? { ok: true }
      : { ok: false, error: TEAM_LEADER_REQUIRED_MESSAGE };
}

// ---------------------------------------------------------------------------
// Staff: toggle the flag
// ---------------------------------------------------------------------------

export type SetStudentTeamLeaderResult =
  | {
      success: true;
      studentClassId: string;
      isTeamLeader: boolean;
      message: string;
    }
  | MutationFailure;

export async function setStudentTeamLeaderForStaff(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { class_id: string; student_class_id: string; is_team_leader: boolean }
): Promise<SetStudentTeamLeaderResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_SET_TEAM_LEADER
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.class_id) || !isUuid(input.student_class_id)) {
    return { success: false, error: "Student not found in this class." };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    input.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const existing = await studentClassRepository.findStudentClassById(
    adminClient,
    input.student_class_id
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data || existing.data.class_id !== input.class_id) {
    return { success: false, error: "Student not found in this class." };
  }

  const message = input.is_team_leader
    ? "Team leader assigned."
    : "Team leader removed.";

  if (existing.data.is_team_leader === input.is_team_leader) {
    return {
      success: true,
      studentClassId: existing.data.id,
      isTeamLeader: existing.data.is_team_leader,
      message,
    };
  }

  const { data, error } =
    await studentClassRepository.updateStudentClassTeamLeader(
      adminClient,
      input.student_class_id,
      input.is_team_leader
    );
  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update team leader.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_class",
    record_id: data.id,
    old_data: { is_team_leader: existing.data.is_team_leader },
    new_data: { is_team_leader: data.is_team_leader },
    metadata: { class_id: data.class_id, user_id: data.user_id },
  });

  return {
    success: true,
    studentClassId: data.id,
    isTeamLeader: data.is_team_leader,
    message,
  };
}

// ---------------------------------------------------------------------------
// Student: reads
// ---------------------------------------------------------------------------

/** Team-leader tab payload, or null when the student is not a team leader. */
export async function getStudentTeamLeaderBundle(
  adminClient: Supabase,
  userId: string,
  classRow: ManagerStudentClassRow
): Promise<StudentTeamLeaderBundle | null> {
  if (!classRow.is_team_leader) {
    return null;
  }

  const allowed = await hasAnyPermission(
    adminClient,
    userId,
    TEAM_LEADER_PERMISSIONS
  );
  if (!allowed) {
    return null;
  }

  const [tasksResult, gradeLock] = await Promise.all([
    classTaskRepository.listClassTasksByClassId(adminClient, classRow.class_id),
    getClassComputedGradeLockState(adminClient, classRow.class_id),
  ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  return {
    tasks: ((tasksResult.data ?? []) as ClassTaskRecord[]).map(mapTaskRecord),
    hasComputedGrades: gradeLock.hasComputedGrades,
    lockedUserIds: gradeLock.lockedUserIds,
  };
}

export async function getTeamLeaderSessionAttendanceForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  sessionId: string
): Promise<
  { success: true; data: TeamLeaderSessionAttendance } | MutationFailure
> {
  const gate = await assertTeamLeaderForClass(
    adminClient,
    actorUserId,
    classId,
    PERMISSIONS.TEAM_LEADER_ATTENDANCE_UPDATE
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  if (!isUuid(sessionId)) {
    return { success: false, error: "Session not found." };
  }

  const sessionResult = await sessionRepository.findSessionById(
    adminClient,
    sessionId
  );
  if (sessionResult.error) {
    return { success: false, error: sessionResult.error.message };
  }
  if (!sessionResult.data || sessionResult.data.class_id !== classId) {
    return { success: false, error: "Session not found." };
  }

  await ensureSessionAttendeesForMembers(adminClient, sessionId, classId);

  const [attendeesResult, gradeLock] = await Promise.all([
    attendeeRepository.listAttendeesBySessionId(adminClient, sessionId),
    getClassComputedGradeLockState(adminClient, classId),
  ]);
  if (attendeesResult.error) {
    return { success: false, error: attendeesResult.error.message };
  }

  const attendeeRecords = (attendeesResult.data ?? []) as AttendeeRecord[];
  const profilesResult =
    await studentProfileRepository.listStudentProfilesByUserIds(
      adminClient,
      attendeeRecords.map((row) => row.student_id)
    );
  if (profilesResult.error) {
    return { success: false, error: profilesResult.error.message };
  }

  const nameByUserId = new Map(
    (profilesResult.data ?? []).map((row) => [row.user_id, row.full_name])
  );

  const attendees = attendeeRecords
    .map((row) => ({
      id: row.id,
      session_id: row.session_id,
      student_id: row.student_id,
      full_name: nameByUserId.get(row.student_id) ?? "Unknown student",
      email: "",
      status: mapAttendeeStatus(row.status),
      created_at: row.created_at,
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name));

  return {
    success: true,
    data: {
      sessionId,
      attendees,
      lockedUserIds: gradeLock.lockedUserIds,
    },
  };
}

// ---------------------------------------------------------------------------
// Student: mutations
// ---------------------------------------------------------------------------

/** Any classmate in any session, including the team leader's own row. */
export async function updateAttendeeForTeamLeader(
  adminClient: Supabase,
  actor: AuditActor,
  input: UpdateAttendeeInput
): Promise<UpdateAttendeeResult> {
  const gate = await assertTeamLeaderForClass(
    adminClient,
    actor.userId,
    input.class_id,
    PERMISSIONS.TEAM_LEADER_ATTENDANCE_UPDATE
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const result = await applyAttendeeUpdate(
    adminClient,
    actor,
    input,
    sameClassAuthorizer(input.class_id)
  );
  if (!result.success) {
    return result;
  }

  return { ...result, attendee: { ...result.attendee, email: "" } };
}

export async function createClassTaskForTeamLeader(
  adminClient: Supabase,
  actor: AuditActor,
  input: CreateClassTaskInput
): Promise<CreateClassTaskResult> {
  const gate = await assertTeamLeaderForClass(
    adminClient,
    actor.userId,
    input.class_id,
    PERMISSIONS.TEAM_LEADER_TASKS_CREATE
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const result = await applyCreateClassTask(
    adminClient,
    actor,
    input,
    sameClassAuthorizer(input.class_id)
  );
  if (!result.success) {
    return result;
  }

  // Team leaders do not see classmates' student-task rows.
  return { ...result, studentTasks: [] };
}

export async function updateClassTaskForTeamLeader(
  adminClient: Supabase,
  actor: AuditActor,
  input: UpdateClassTaskInput
): Promise<UpdateClassTaskResult> {
  const gate = await assertTeamLeaderForClass(
    adminClient,
    actor.userId,
    input.class_id,
    PERMISSIONS.TEAM_LEADER_TASKS_UPDATE
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  return applyUpdateClassTask(
    adminClient,
    actor,
    input,
    sameClassAuthorizer(input.class_id)
  );
}

/** Start only — team leaders cannot un-start a task. */
export async function startClassTaskForTeamLeader(
  adminClient: Supabase,
  actor: AuditActor,
  input: { id: string; class_id: string }
): Promise<SetClassTaskStartedResult> {
  const gate = await assertTeamLeaderForClass(
    adminClient,
    actor.userId,
    input.class_id,
    PERMISSIONS.TEAM_LEADER_TASKS_START
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  return applyClassTaskStart(
    adminClient,
    actor,
    { id: input.id, class_id: input.class_id, started: true },
    sameClassAuthorizer(input.class_id)
  );
}
