import "server-only";

import { ROLES } from "@/lib/constants/roles";
import { UNAUTHORIZED_MESSAGE } from "@/services/auth/authorization.service";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Lightweight assignment gate — does not load sessions/tasks.
 * Returns assigned_at when the actor teaches this class.
 */
export async function assertTeachingAssignment(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{ ok: true; assignedAt: string | null } | { ok: false }> {
  if (!actorUserId) {
    return { ok: false };
  }

  const assignment =
    await classTeacherRepository.findClassTeacherByTeacherAndClass(
      adminClient,
      actorUserId,
      classId
    );

  if (assignment.error) {
    throw new Error(assignment.error.message);
  }

  if (!assignment.data) {
    return { ok: false };
  }

  return { ok: true, assignedAt: assignment.data.assigned_at };
}

/**
 * Teachers may only mutate classes they are assigned to.
 * Other roles rely on permission checks already performed by the caller.
 * When `actor.role` is omitted (tests / legacy callers), assignment is skipped.
 */
export async function assertAssignedTeacherForClassMutation(
  adminClient: Supabase,
  actor: AuditActor,
  classId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!actor.userId) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }

  if (actor.role !== ROLES.TEACHER) {
    return { ok: true };
  }

  const assignment = await assertTeachingAssignment(
    adminClient,
    actor.userId,
    classId
  );

  if (!assignment.ok) {
    return {
      ok: false,
      error: "You can only change classes you are assigned to teach.",
    };
  }

  return { ok: true };
}
