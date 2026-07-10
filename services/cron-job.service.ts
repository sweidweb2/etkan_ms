import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { getManagerCronJobsCatalog } from "@/lib/constants/manager-cron-jobs";
import type { ManagerCronJobRow } from "@/types/manager-cron-job";

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

export async function listCronJobsForManager(
  actorRole: RoleValue | null
): Promise<ManagerCronJobRow[]> {
  assertManagerRole(actorRole);
  return getManagerCronJobsCatalog();
}
