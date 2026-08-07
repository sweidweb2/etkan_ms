import { PERMISSIONS } from "@/lib/constants/permissions";
import * as cloudflareAiUsageRepository from "@/repositories/cloudflare-ai-usage.repository";
import type { CreateCloudflareAiUsageInput } from "@/repositories/cloudflare-ai-usage.repository";
import { assertPermission } from "@/services/authorization.service";
import type {
  ManagerCloudflareAiUsageListRow,
  ManagerCloudflareAiUsageRow,
} from "@/types/manager-cloudflare-ai-usage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const DEFAULT_LIST_LIMIT = 500;

function mapUsageRecord(
  record: cloudflareAiUsageRepository.CloudflareAiUsageRecord
): ManagerCloudflareAiUsageRow {
  return {
    id: record.id,
    created_at: record.created_at,
    user_id: record.user_id,
    user_label: record.user_label,
    feature: record.feature,
    model: record.model,
    prompt: record.prompt,
    response: record.response,
    status: record.status as ManagerCloudflareAiUsageRow["status"],
    error_message: record.error_message,
    prompt_tokens: record.prompt_tokens,
    completion_tokens: record.completion_tokens,
    total_tokens: record.total_tokens,
    tool_rounds: record.tool_rounds,
    metadata: record.metadata,
  };
}

function mapUsageListRecord(
  record: cloudflareAiUsageRepository.CloudflareAiUsageListRecord
): ManagerCloudflareAiUsageListRow {
  return {
    id: record.id,
    created_at: record.created_at,
    user_id: record.user_id,
    user_label: record.user_label,
    feature: record.feature,
    model: record.model,
    status: record.status as ManagerCloudflareAiUsageListRow["status"],
    error_message: record.error_message,
    prompt_tokens: record.prompt_tokens,
    completion_tokens: record.completion_tokens,
    total_tokens: record.total_tokens,
    tool_rounds: record.tool_rounds,
    metadata: record.metadata,
  };
}

export async function recordCloudflareAiUsage(
  adminClient: Supabase,
  input: CreateCloudflareAiUsageInput
): Promise<void> {
  const { error } = await cloudflareAiUsageRepository.createCloudflareAiUsage(
    adminClient,
    input
  );
  if (error) {
    // Do not fail the user-facing AI request if logging fails.
    console.error("Failed to record Cloudflare AI usage:", error.message);
  }
}

export async function listCloudflareAiUsageForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerCloudflareAiUsageListRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW
  );

  const result = await cloudflareAiUsageRepository.listCloudflareAiUsageSummary(
    adminClient,
    { limit: DEFAULT_LIST_LIMIT }
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).map((record) =>
    mapUsageListRecord(
      record as cloudflareAiUsageRepository.CloudflareAiUsageListRecord
    )
  );
}

export async function getCloudflareAiUsageByIdForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  id: string
): Promise<ManagerCloudflareAiUsageRow | null> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW
  );

  const result = await cloudflareAiUsageRepository.findCloudflareAiUsageById(
    adminClient,
    id
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    return null;
  }

  return mapUsageRecord(
    result.data as cloudflareAiUsageRepository.CloudflareAiUsageRecord
  );
}
