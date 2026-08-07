import type { Json } from "@/types/supabase";

export type CloudflareAiUsageStatus = "success" | "refused" | "error";

export type ManagerCloudflareAiUsageListRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_label: string;
  feature: string;
  model: string;
  status: CloudflareAiUsageStatus;
  error_message: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  tool_rounds: number;
  metadata: Json | null;
};

export type ManagerCloudflareAiUsageRow = ManagerCloudflareAiUsageListRow & {
  prompt: string;
  response: string | null;
};
