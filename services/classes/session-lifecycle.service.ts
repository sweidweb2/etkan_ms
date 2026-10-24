import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { updateClassSessionSchema } from "@/lib/validators/manager/update-class-session";
import { updateSessionSettingsSchema } from "@/lib/validators/manager/update-session-settings";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { assertClassStructureUnlockedForComputedGrades } from "@/services/classes/class-computed-grade-lock.service";
import {
  isUuid,
  mapSessionRecord,
  normalizeOptionalString,
  toIsoOrNull,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/session-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

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
    session_report?: string;
  }
): Promise<UpdateSessionSettingsResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SESSIONS_UPDATE_SETTINGS);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateSessionSettingsSchema.safeParse({
    semester_id: input.semester_id,
    group_grade_level: input.group_grade_level,
    session_report: input.session_report,
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

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data || existing.data.class_id !== input.class_id) {
    return { success: false, error: "Session not found." };
  }

  const patch: {
    semester_id?: string | null;
    group_grade_level?: string | null;
    session_report?: string | null;
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

  if (parsed.data.session_report !== undefined) {
    patch.session_report = normalizeOptionalString(parsed.data.session_report);
  }

  if (
    patch.semester_id === undefined &&
    patch.group_grade_level === undefined &&
    patch.session_report === undefined
  ) {
    return {
      success: false,
      error: "Provide a phase, group grade, or session report to update.",
    };
  }

  const touchesStructure =
    patch.semester_id !== undefined || patch.group_grade_level !== undefined;

  if (touchesStructure) {
    const structureGuard = await assertClassStructureUnlockedForComputedGrades(
      adminClient,
      input.class_id
    );

    if (!structureGuard.ok) {
      return { success: false, error: structureGuard.error };
    }
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
      session_report: existing.data.session_report,
    },
    new_data: {
      semester_id: session.semester_id,
      group_grade_level: session.group_grade_level,
      session_report: session.session_report,
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
    session_report?: string;
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
    session_report: input.session_report,
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
      session_report: normalizeOptionalString(parsed.data.session_report),
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
      session_report: existing.data.session_report,
      starts_at: existing.data.starts_at,
      ends_at: existing.data.ends_at,
    },
    new_data: {
      topic: session.topic,
      session_report: session.session_report,
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

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    session.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    session.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  if (session.group_grade_level) {
    return {
      success: false,
      error: "Clear the session difficulty before deleting.",
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
