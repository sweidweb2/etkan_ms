import "server-only";

import {
  AUTO_SESSION_LEAD_DAYS,
  CLASS_WEEK_SKIP_BLOCKED_REASONS,
} from "@/lib/constants/class-session-skips";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { ATTENDEE_STATUSES } from "@/lib/constants/manager-attendee-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import {
  buildClassWeekSkipState,
  EMPTY_CLASS_WEEK_SKIP_STATE,
  toAppIsoDate,
  type ClassWeekSkipState,
} from "@/lib/manager/class-week-skips";
import {
  skipClassWeekSchema,
  unskipClassWeekSchema,
} from "@/lib/validators/manager/class-week-skip";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classSessionSkipRepository from "@/repositories/class-session-skip.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { getClassComputedGradeLockState } from "@/services/classes/class-computed-grade-lock.service";
import { mapSessionRecord, type MutationFailure } from "@/services/classes/session-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import { notifyManagersOfClassWeekSkipChange } from "@/services/communications/notification.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const FORM_ERROR_MESSAGE = "Please fix the errors below.";

type ClassSkipContext = {
  className: string;
  state: ClassWeekSkipState;
};

type SkipStateSession = Pick<
  SessionRecord,
  "id" | "starts_at" | "ends_at" | "session_report"
>;

function latestSessionOf(sessions: readonly SkipStateSession[]) {
  return sessions.reduce<SkipStateSession | null>(
    (current, session) =>
      !current ||
      new Date(session.starts_at).getTime() >
        new Date(current.starts_at).getTime()
        ? session
        : current,
    null
  );
}

/**
 * Loads class, skips, grade lock and (when needed) attendance changes, then
 * builds the skip state. Pass `sessions` when the caller already has them.
 */
async function loadClassSkipContext(
  adminClient: Supabase,
  input: {
    classId: string;
    actorRole: AuditActor["role"];
    sessions?: readonly SkipStateSession[];
    now?: Date;
  }
): Promise<ClassSkipContext | null> {
  const [classResult, sessionsResult, skipsResult, gradeLock] =
    await Promise.all([
      classRepository.findClassDetailById(adminClient, input.classId),
      input.sessions
        ? Promise.resolve({ data: input.sessions, error: null })
        : sessionRepository.listSessionsByClassId(adminClient, input.classId),
      classSessionSkipRepository.listClassSessionSkipsByClassId(
        adminClient,
        input.classId
      ),
      getClassComputedGradeLockState(adminClient, input.classId),
    ]);

  if (classResult.error) {
    throw new Error(classResult.error.message);
  }

  if (!classResult.data) {
    return null;
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (skipsResult.error) {
    throw new Error(skipsResult.error.message);
  }

  const sessions = (sessionsResult.data ?? []) as readonly SkipStateSession[];
  const now = input.now ?? new Date();
  const latest = latestSessionOf(sessions);

  let latestSessionHasAttendanceChanges = false;
  if (
    latest &&
    new Date(latest.ends_at).getTime() > now.getTime() &&
    !latest.session_report?.trim()
  ) {
    const attendance =
      await attendeeRepository.countSessionAttendeesNotInStatus(
        adminClient,
        latest.id,
        ATTENDEE_STATUSES.PRESENT
      );

    if (attendance.error) {
      throw new Error(attendance.error.message);
    }

    latestSessionHasAttendanceChanges = (attendance.count ?? 0) > 0;
  }

  const classRecord = classResult.data as {
    name: string;
    status: string | null;
    subjects: { nb_sessions: number } | null;
  };

  return {
    className: classRecord.name,
    state: buildClassWeekSkipState({
      now,
      isTeacher: input.actorRole === ROLES.TEACHER,
      classInProgress: classRecord.status === CLASS_STATUSES.IN_PROGRESS,
      hasComputedGrades: gradeLock.hasComputedGrades,
      plannedSessions: classRecord.subjects?.nb_sessions ?? null,
      sessions,
      skips: skipsResult.data ?? [],
      latestSessionHasAttendanceChanges,
    }),
  };
}

/** Skip state for page loaders that already proved access to the class. */
export async function getClassWeekSkipState(
  adminClient: Supabase,
  input: {
    classId: string;
    actorRole: AuditActor["role"];
    sessions?: readonly SkipStateSession[];
  }
): Promise<ClassWeekSkipState> {
  const context = await loadClassSkipContext(adminClient, input);
  return context?.state ?? EMPTY_CLASS_WEEK_SKIP_STATE;
}

export async function getClassWeekSkipStateForManager(
  adminClient: Supabase,
  actor: AuditActor,
  classId: string,
  sessions?: readonly SkipStateSession[]
): Promise<ClassWeekSkipState> {
  await assertPermission(adminClient, actor.userId, PERMISSIONS.SESSIONS_VIEW);

  return getClassWeekSkipState(adminClient, {
    classId,
    actorRole: actor.role,
    sessions,
  });
}

export type SkipClassWeekResult =
  | {
      success: true;
      message: string;
      state: ClassWeekSkipState;
      deletedSessionId: string | null;
    }
  | MutationFailure;

export async function skipClassWeekForManager(
  adminClient: Supabase,
  actor: AuditActor,
  input: {
    class_id: string;
    skip_date: string;
    session_id?: string;
    reason?: string;
  }
): Promise<SkipClassWeekResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actor.userId,
    PERMISSIONS.SESSIONS_SKIP
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = skipClassWeekSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: FORM_ERROR_MESSAGE,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const classId = parsed.data.class_id;
  const sessionId = parsed.data.session_id?.trim() || null;
  const reason = parsed.data.reason?.trim() || null;

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    classId
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const context = await loadClassSkipContext(adminClient, {
    classId,
    actorRole: actor.role,
  });
  if (!context) {
    return { success: false, error: "Class not found." };
  }

  const { state } = context;
  let skipDate = parsed.data.skip_date;

  if (sessionId) {
    const latest = state.latestSession;
    if (!latest) {
      return {
        success: false,
        error: CLASS_WEEK_SKIP_BLOCKED_REASONS.SESSION_ENDED,
      };
    }
    if (latest.sessionId !== sessionId) {
      return {
        success: false,
        error: CLASS_WEEK_SKIP_BLOCKED_REASONS.NOT_LATEST_SESSION,
      };
    }
    if (!latest.canSkip) {
      return {
        success: false,
        error: latest.blockedReason ?? "This session cannot be skipped.",
      };
    }
    skipDate = latest.date;
  } else {
    const week = state.weeks.find((entry) => entry.date === skipDate);
    if (!week) {
      return {
        success: false,
        error: "This week cannot be skipped. Refresh and try again.",
      };
    }
    if (week.skipped) {
      return { success: false, error: "This week is already skipped." };
    }
    if (!week.canSkip) {
      return {
        success: false,
        error: week.blockedReason ?? "This week cannot be skipped.",
      };
    }
  }

  const { data: skipId, error } = await classSessionSkipRepository.skipClassWeek(
    adminClient,
    {
      classId,
      skipDate,
      reason,
      createdBy: actor.userId,
      sessionId,
    }
  );

  if (error || !skipId) {
    const message = error?.message.toLowerCase() ?? "";
    if (message.includes("duplicate") || message.includes("unique")) {
      return { success: false, error: "This week is already skipped." };
    }
    if (message.includes("session_not_found")) {
      return { success: false, error: "Session not found." };
    }
    return {
      success: false,
      error: "Unable to skip this week. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: sessionId ? "warning" : "info",
    table_name: "class_session_skips",
    record_id: skipId,
    new_data: { class_id: classId, skip_date: skipDate, reason },
    metadata: {
      note: sessionId
        ? "Class week skipped; its pre-created session was deleted."
        : "Class week skipped.",
      deleted_session_id: sessionId,
    },
  });

  if (actor.role === ROLES.TEACHER) {
    await notifyManagersOfClassWeekSkipChange(adminClient, {
      classId,
      className: context.className,
      skipDate,
      isSkipped: true,
      actorLabel: actor.userLabel,
      actorUserId: actor.userId,
      reason,
    });
  }

  const next = await loadClassSkipContext(adminClient, {
    classId,
    actorRole: actor.role,
  });

  return {
    success: true,
    message: "Week skipped.",
    state: next?.state ?? EMPTY_CLASS_WEEK_SKIP_STATE,
    deletedSessionId: sessionId,
  };
}

export type UnskipClassWeekResult =
  | {
      success: true;
      message: string;
      state: ClassWeekSkipState;
      createdSession: ManagerClassSessionRow | null;
    }
  | MutationFailure;

export async function unskipClassWeekForManager(
  adminClient: Supabase,
  actor: AuditActor,
  input: { class_id: string; skip_date: string }
): Promise<UnskipClassWeekResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actor.userId,
    PERMISSIONS.SESSIONS_SKIP
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = unskipClassWeekSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: FORM_ERROR_MESSAGE,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { class_id: classId, skip_date: skipDate } = parsed.data;

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    classId
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  if (skipDate < toAppIsoDate(new Date())) {
    return { success: false, error: "Past weeks cannot be restored." };
  }

  const existing = await classSessionSkipRepository.findClassSessionSkip(
    adminClient,
    classId,
    skipDate
  );
  if (existing.error) {
    return {
      success: false,
      error: "Unable to restore this week. Please try again.",
    };
  }
  if (!existing.data) {
    return { success: false, error: "This week is not skipped." };
  }

  const { error: deleteError } =
    await classSessionSkipRepository.deleteClassSessionSkipById(
      adminClient,
      existing.data.id
    );
  if (deleteError) {
    return {
      success: false,
      error: "Unable to restore this week. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "info",
    table_name: "class_session_skips",
    record_id: existing.data.id,
    old_data: {
      class_id: classId,
      skip_date: skipDate,
      reason: existing.data.reason,
    },
    metadata: { note: "Class week restored." },
  });

  // Restored week may already be inside the lead window; create it now.
  let createdSession: ManagerClassSessionRow | null = null;
  const created = await classSessionSkipRepository.createNextWeeklySessionForClass(
    adminClient,
    classId,
    AUTO_SESSION_LEAD_DAYS
  );

  if (created.error) {
    console.error("[class-week-skip] create next session after unskip failed", {
      classId,
      message: created.error.message,
    });
  } else if (created.data) {
    const session = await sessionRepository.findSessionById(
      adminClient,
      created.data
    );
    if (session.data) {
      createdSession = mapSessionRecord(session.data as SessionRecord);
    }
  }

  const context = await loadClassSkipContext(adminClient, {
    classId,
    actorRole: actor.role,
  });

  if (actor.role === ROLES.TEACHER && context) {
    await notifyManagersOfClassWeekSkipChange(adminClient, {
      classId,
      className: context.className,
      skipDate,
      isSkipped: false,
      actorLabel: actor.userLabel,
      actorUserId: actor.userId,
    });
  }

  return {
    success: true,
    message: createdSession
      ? `Week restored. Session ${createdSession.topic} was created.`
      : "Week restored.",
    state: context?.state ?? EMPTY_CLASS_WEEK_SKIP_STATE,
    createdSession,
  };
}
