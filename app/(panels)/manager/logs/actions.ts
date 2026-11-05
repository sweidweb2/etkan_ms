"use server";

import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseDeleteAuditLogsFormData } from "@/lib/validators/manager/delete-audit-logs";
import {
  deleteAuditLogsForManager,
  getAuditLogByIdForManager,
  listAuditLogsForManager,
  type ManagerAuditLogsPage,
} from "@/services/ops/audit-log.service";
import type {
  AuditLogCursor,
  DeleteAuditLogsActionState,
} from "@/types/manager-audit-log";
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

export async function deleteAuditLogsAction(
  _prevState: DeleteAuditLogsActionState,
  formData: FormData
): Promise<DeleteAuditLogsActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteAuditLogsFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteAuditLogsForManager(adminClient, actor.userId, actor, data.ids),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_LOGS);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      deleted_ids: result.deleted_ids,
    }),
  });
}
