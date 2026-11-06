import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { updateAttendeeSchema } from "@/lib/validators/manager/update-attendee";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as sessionRepository from "@/repositories/session.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { assertStudentGradeInputsUnlockedForComputedGrade } from "@/services/classes/class-computed-grade-lock.service";
import {
  updateStudentTaskForManager as updateClassStudentTaskForManager,
  type UpdateStudentTaskResult as UpdateClassStudentTaskResult,
} from "@/services/classes/class-tasks.service";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import {
  buildStudentDisplayByUserId,
  loadEditorNameById,
  mapAttendeeStatus,
  type ClassMutationAuthorizer,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/session-shared";
import type { AttendeeStatusValue } from "@/lib/constants/manager-attendee-status";
import type {
  ManagerClassTaskRow,
  ManagerSessionAttendeeRow,
} from "@/types/manager-class-session-detail";

const SESSION_TASKS_REMOVED_ERROR =
  "Session tasks were replaced by class tasks. Manage tasks from the class page.";

/**
 * @deprecated Session-scoped tasks no longer exist. Use
 * `createClassTaskForManager` from `@/services/classes/class-tasks.service`.
 */
export type CreateSessionTaskResult =
  | {
      success: true;
      task: ManagerClassTaskRow;
      message: string;
    }
  | MutationFailure;

/** @deprecated Use `createClassTaskForManager`. Always fails. */
export async function createSessionTaskForManager(
  _adminClient: Supabase,
  _actorUserId: string | null,
  _actor: AuditActor,
  _input: {
    class_id: string;
    session_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<CreateSessionTaskResult> {
  return { success: false, error: SESSION_TASKS_REMOVED_ERROR };
}

/** @deprecated Use `UpdateClassTaskResult` from class-tasks.service. */
export type UpdateSessionTaskResult =
  | {
      success: true;
      task: ManagerClassTaskRow;
      gradesClamped: boolean;
      message: string;
    }
  | MutationFailure;

/** @deprecated Use `updateClassTaskForManager`. Always fails. */
export async function updateSessionTaskForManager(
  _adminClient: Supabase,
  _actorUserId: string | null,
  _actor: AuditActor,
  _input: {
    id: string;
    class_id: string;
    session_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<UpdateSessionTaskResult> {
  return { success: false, error: SESSION_TASKS_REMOVED_ERROR };
}

/** @deprecated Use `DeleteClassTaskResult` from class-tasks.service. */
export type DeleteSessionTaskResult =
  | {
      success: true;
      classId: string;
      sessionId: string;
      message: string;
    }
  | MutationFailure;

/** @deprecated Use `deleteClassTaskForManager`. Always fails. */
export async function deleteSessionTaskForManager(
  _adminClient: Supabase,
  _actorUserId: string | null,
  _actor: AuditActor,
  _input: {
    id: string;
    class_id: string;
    session_id: string;
  }
): Promise<DeleteSessionTaskResult> {
  return { success: false, error: SESSION_TASKS_REMOVED_ERROR };
}

export type UpdateAttendeeResult =
  | {
      success: true;
      attendee: ManagerSessionAttendeeRow;
      message: string;
    }
  | MutationFailure;

export type UpdateAttendeeInput = {
  id: string;
  class_id: string;
  session_id: string;
  status: AttendeeStatusValue;
};

/**
 * Update an existing attendee row. No membership gate: former members keep
 * historical rows and those rows remain editable.
 */
export async function updateAttendeeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: UpdateAttendeeInput
): Promise<UpdateAttendeeResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.ATTENDANCE_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  return applyAttendeeUpdate(adminClient, actor, input, (classId) =>
    assertAssignedTeacherForClassMutation(adminClient, actor, classId)
  );
}

/**
 * Shared attendance update core. Callers check their role permission first;
 * `authorizeClass` runs once the attendee/session/class chain is verified.
 */
export async function applyAttendeeUpdate(
  adminClient: Supabase,
  actor: AuditActor,
  input: UpdateAttendeeInput,
  authorizeClass: ClassMutationAuthorizer
): Promise<UpdateAttendeeResult> {
  const parsed = updateAttendeeSchema.safeParse({
    status: input.status,
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

  const scope = await authorizeClass(input.class_id);
  if (!scope.ok) {
    return { success: false, error: scope.error };
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
      updated_by: actor.userId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update attendance.",
    };
  }

  const [displayByUserId, editorNameById] = await Promise.all([
    buildStudentDisplayByUserId(adminClient, [data.student_id]),
    loadEditorNameById(adminClient, [data.updated_by]),
  ]);
  const display = displayByUserId.get(data.student_id);

  const attendee: ManagerSessionAttendeeRow = {
    id: data.id,
    session_id: data.session_id,
    student_id: data.student_id,
    full_name: display?.full_name ?? "Unknown student",
    email: display?.email ?? "",
    status: mapAttendeeStatus(data.status),
    created_at: data.created_at,
    updated_at: data.updated_at,
    updated_by: data.updated_by,
    updated_by_name: data.updated_by
      ? (editorNameById.get(data.updated_by) ?? null)
      : null,
  };

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "attendee",
    record_id: attendee.id,
    old_data: {
      status: existing.data.status,
    },
    new_data: {
      status: attendee.status,
    },
  });

  return {
    success: true,
    attendee,
    message: "Attendance updated.",
  };
}

/**
 * Student task grading now lives in class-tasks.service. `sessionId` is kept
 * (always null) so existing action revalidation code keeps compiling.
 */
export type UpdateStudentTaskResult =
  | (Extract<UpdateClassStudentTaskResult, { success: true }> & {
      sessionId: string | null;
    })
  | MutationFailure;

export async function updateStudentTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: Parameters<typeof updateClassStudentTaskForManager>[3]
): Promise<UpdateStudentTaskResult> {
  const result = await updateClassStudentTaskForManager(
    adminClient,
    actorUserId,
    actor,
    input
  );

  if (!result.success) {
    return result;
  }

  return { ...result, sessionId: null };
}
