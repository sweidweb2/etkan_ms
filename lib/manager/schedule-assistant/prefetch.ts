import "server-only";

import type { ScheduleAssistantRoute } from "@/lib/constants/schedule-assistant";
import {
  listCapabilityMatrixCatalog,
  listInstructorsCatalog,
  listSlotsThisWeekCatalog,
  listSubjectsCatalog,
} from "@/services/schedule/schedule-assistant.service";
import { assertPermission } from "@/services/auth/authorization.service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Fixed catalog prefetch for the 3-router assistant.
 * Loaders assert permission; refuse still asserts once then returns {}.
 */
export async function prefetchForRoute(
  adminClient: Supabase,
  actorUserId: string | null,
  route: ScheduleAssistantRoute
): Promise<ScheduleAssistantPrefetchCatalogs> {
  if (route === "refuse") {
    await assertPermission(
      adminClient,
      actorUserId,
      PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
    );
    return {};
  }

  if (route === "capabilities") {
    const [instructors, subjects, matrix] = await Promise.all([
      listInstructorsCatalog(adminClient, actorUserId),
      listSubjectsCatalog(adminClient, actorUserId),
      listCapabilityMatrixCatalog(adminClient, actorUserId),
    ]);
    return { instructors, subjects, matrix };
  }

  if (route === "availability") {
    const [instructors, slots] = await Promise.all([
      listInstructorsCatalog(adminClient, actorUserId),
      listSlotsThisWeekCatalog(adminClient, actorUserId),
    ]);
    return { instructors, slots };
  }

  const [instructors, subjects, matrix, slots] = await Promise.all([
    listInstructorsCatalog(adminClient, actorUserId),
    listSubjectsCatalog(adminClient, actorUserId),
    listCapabilityMatrixCatalog(adminClient, actorUserId),
    listSlotsThisWeekCatalog(adminClient, actorUserId),
  ]);
  return { instructors, subjects, matrix, slots };
}
