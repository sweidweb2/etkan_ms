"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCloudflareAiUsageByIdForManager } from "@/services/cloudflare-ai-usage.service";
import type { ManagerCloudflareAiUsageRow } from "@/types/manager-cloudflare-ai-usage";

export async function loadCloudflareAiUsageDetailAction(
  id: string
): Promise<ManagerCloudflareAiUsageRow | null> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await getCloudflareAiUsageByIdForManager(
      adminClient,
      actor.userId,
      id
    );
  } catch {
    return null;
  }
}
