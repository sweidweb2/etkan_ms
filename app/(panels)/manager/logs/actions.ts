"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAuditLogByIdForManager,
  listAuditLogsForManager,
  type ManagerAuditLogsPage,
} from "@/services/ops/audit-log.service";
import type { AuditLogCursor } from "@/types/manager-audit-log";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";

export async function fetchAuditLogDetailsAction(
  id: string
): Promise<ManagerAuditLogRow | null> {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  return getAuditLogByIdForManager(adminClient, user?.id ?? null, id);
}

export async function loadAuditLogsPageAction(input: {
  cursor?: AuditLogCursor | null;
}): Promise<ManagerAuditLogsPage> {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  if (!user?.id) {
    return { logs: [], nextCursor: null };
  }

  try {
    return await listAuditLogsForManager(adminClient, user.id, {
      cursor: input.cursor ?? null,
    });
  } catch {
    return { logs: [], nextCursor: null };
  }
}
