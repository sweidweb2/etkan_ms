import "server-only";

import { ROLES } from "@/lib/constants/roles";
import { UNAUTHORIZED_MESSAGE } from "@/services/auth/authorization.service";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export const TEACHER_CLASS_ASSIGNMENT_REQUIRED_MESSAGE =
  "You can only change classes you are assigned to teach.";

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
 * Missing `actor.role` fails closed (do not skip assignment for teachers).
 */
export async function assertAssignedTeacherForClassMutation(
  adminClient: Supabase,
  actor: AuditActor,
  classId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!actor.userId) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }

  if (actor.role == null) {
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
      error: TEACHER_CLASS_ASSIGNMENT_REQUIRED_MESSAGE,
    };
  }

  return { ok: true };
}

/**
 * Same assignment gate across multiple class ids (e.g. transfer / copy).
 */
export async function assertAssignedTeacherForClassIds(
  adminClient: Supabase,
  actor: AuditActor,
  classIds: readonly string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniqueIds = [...new Set(classIds.filter(Boolean))];
  for (const classId of uniqueIds) {
    const scope = await assertAssignedTeacherForClassMutation(
      adminClient,
      actor,
      classId
    );
    if (!scope.ok) {
      return scope;
    }
  }
  return { ok: true };
}

/**
 * Teachers must not create unscoped classes (no class_id to assign against).
 * Missing `actor.role` fails closed.
 */
export function assertTeacherMayCreateClass(
  actor: AuditActor
): { ok: true } | { ok: false; error: string } {
  if (!actor.userId) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }
  if (actor.role == null) {
    return { ok: false, error: UNAUTHORIZED_MESSAGE };
  }
  if (actor.role === ROLES.TEACHER) {
    return { ok: false, error: TEACHER_CLASS_ASSIGNMENT_REQUIRED_MESSAGE };
  }
  return { ok: true };
}
