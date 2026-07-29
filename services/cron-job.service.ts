import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerCronJobsCatalog } from "@/lib/constants/manager-cron-jobs";
import { assertPermission } from "@/services/authorization.service";
import type { ManagerCronJobRow } from "@/types/manager-cron-job";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function listCronJobsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerCronJobRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.CRON_JOBS_VIEW
  );
  return getManagerCronJobsCatalog();
}
