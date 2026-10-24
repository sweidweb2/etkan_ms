"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassComputedGradeLockStateForManager } from "@/services/classes/class-computed-grade-lock.service";
import { getSessionDetailForManager } from "@/services/classes/session.service";
import { getTeachingClassDetailForSelf } from "@/services/classes/teacher-class-self.service";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerSessionAttendeeRow } from "@/types/manager-class-session-detail";

export type TeacherClassSessionInlineDetail = {
  session: ManagerClassSessionRow;
  attendees: ManagerSessionAttendeeRow[];
  lockedUserIds: string[];
  hasComputedGrades: boolean;
};

/** Load attendance-ready session detail for the teacher class Sessions tab. */
export async function loadTeacherClassSessionDetailAction(
  classId: string,
  sessionId: string
): Promise<TeacherClassSessionInlineDetail | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();

  try {
    const teaching = await getTeachingClassDetailForSelf(
      adminClient,
      actor.userId,
      classId
    );
    if (!teaching) {
      return null;
    }

    const [detail, computedGradeLock] = await Promise.all([
      getSessionDetailForManager(adminClient, actor.userId, classId, sessionId),
      getClassComputedGradeLockStateForManager(
        adminClient,
        actor.userId,
        classId
      ),
    ]);

    if (!detail) {
      return null;
    }

    return {
      session: detail.session,
      attendees: detail.attendees,
      lockedUserIds: computedGradeLock.lockedUserIds,
      hasComputedGrades: computedGradeLock.hasComputedGrades,
    };
  } catch {
    return null;
  }
}
