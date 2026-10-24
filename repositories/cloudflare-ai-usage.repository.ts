import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const USAGE_COLUMNS =
  "id, created_at, user_id, user_label, feature, model, prompt, response, status, error_message, prompt_tokens, completion_tokens, total_tokens, tool_rounds, metadata";

export type CloudflareAiUsageRecord = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_label: string;
  feature: string;
  model: string;
  prompt: string;
  response: string | null;
  status: string;
  error_message: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  tool_rounds: number;
  metadata: Json | null;
};

export type CreateCloudflareAiUsageInput = {
  user_id?: string | null;
  user_label: string;
  feature: string;
  model: string;
  prompt: string;
  response?: string | null;
  status: string;
  error_message?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  tool_rounds?: number;
  metadata?: Json | null;
};

export async function createCloudflareAiUsage(
  client: Supabase,
  input: CreateCloudflareAiUsageInput
) {
  return client
    .from("cloudflare_ai_usage")
    .insert({
      user_id: input.user_id ?? null,
      user_label: input.user_label,
      feature: input.feature,
      model: input.model,
      prompt: input.prompt,
      response: input.response ?? null,
      status: input.status,
      error_message: input.error_message ?? null,
      prompt_tokens: input.prompt_tokens ?? null,
      completion_tokens: input.completion_tokens ?? null,
      total_tokens: input.total_tokens ?? null,
      tool_rounds: input.tool_rounds ?? 0,
      metadata: input.metadata ?? null,
    })
    .select(USAGE_COLUMNS)
    .single();
}

export async function listCloudflareAiUsage(
  client: Supabase,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 500;
  return client
    .from("cloudflare_ai_usage")
    .select(USAGE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
}
