"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuditLogByIdForManager } from "@/services/audit-log.service";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";

export async function fetchAuditLogDetailsAction(
  id: string
): Promise<ManagerAuditLogRow | null> {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  return getAuditLogByIdForManager(adminClient, user?.id ?? null, id);
}
