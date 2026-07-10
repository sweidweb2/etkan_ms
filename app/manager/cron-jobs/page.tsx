import { ManageCronJobsPanel } from "@/components/manager/cron-jobs/manage-cron-jobs-panel";
import { getSessionRole } from "@/lib/auth/session";
import { listCronJobsForManager } from "@/services/cron-job.service";

export default async function ManagerCronJobsPage() {
  const role = await getSessionRole();
  const jobs = await listCronJobsForManager(role);

  return <ManageCronJobsPanel initialJobs={jobs} />;
}
