import { ManageCloudflareAiUsagePanel } from "@/components/manager/cloudflare-ai-usage/manage-cloudflare-ai-usage-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCloudflareAiUsageForManager } from "@/services/cloudflare-ai-usage.service";

export default async function ManagerCloudflareAiUsagePage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const records = await listCloudflareAiUsageForManager(
    adminClient,
    user?.id ?? null
  );

  return <ManageCloudflareAiUsagePanel initialRecords={records} />;
}
