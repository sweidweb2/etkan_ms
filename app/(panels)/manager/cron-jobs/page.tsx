import { ManageCronJobsPanel } from "@/components/manager/cron-jobs/manage-cron-jobs-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCronJobsForManager } from "@/services/ops/cron-job.service";

export default async function ManagerCronJobsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const jobs = await listCronJobsForManager(adminClient, user?.id ?? null);

  return <ManageCronJobsPanel initialJobs={jobs} />;
}
