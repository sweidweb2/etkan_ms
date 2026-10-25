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
import {
  buildStudentDisplayByUserId,
  mapAttendeeStatus,
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
  }
): Promise<UpdateAttendeeResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.ATTENDANCE_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

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
