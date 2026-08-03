import { SCHEDULE_ASSISTANT_DEFAULT_MODEL } from "@/lib/constants/schedule-assistant";
import type { ManagerCloudflareAiUsageRow } from "@/types/manager-cloudflare-ai-usage";

/** Published Workers AI unit rates for Nemotron (USD per 1M tokens). */
export const CLOUDFLARE_AI_ESTIMATED_INPUT_USD_PER_M = 0.5;
export const CLOUDFLARE_AI_ESTIMATED_OUTPUT_USD_PER_M = 1.5;

export type CloudflareAiUsageDailyPoint = {
  day_key: string;
  label: string;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_spend_usd: number;
};

function toUtcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function estimateCloudflareAiSpendUsd(input: {
  promptTokens: number;
  completionTokens: number;
}): number {
  const promptCost =
    (Math.max(0, input.promptTokens) / 1_000_000) *
    CLOUDFLARE_AI_ESTIMATED_INPUT_USD_PER_M;
  const completionCost =
    (Math.max(0, input.completionTokens) / 1_000_000) *
    CLOUDFLARE_AI_ESTIMATED_OUTPUT_USD_PER_M;
  return promptCost + completionCost;
}

/**
 * Build a continuous daily series for the last `dayCount` UTC days
 * (including today), aggregating requests / tokens / estimated spend.
 */
export function buildCloudflareAiUsageDailySeries(
  records: ManagerCloudflareAiUsageRow[],
  dayCount = 14,
  now = new Date()
): CloudflareAiUsageDailyPoint[] {
  const todayKey = now.toISOString().slice(0, 10);
  const end = new Date(`${todayKey}T00:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (dayCount - 1));

  const buckets = new Map<string, CloudflareAiUsageDailyPoint>();
  for (let i = 0; i < dayCount; i += 1) {
    const cursor = new Date(start);
    cursor.setUTCDate(start.getUTCDate() + i);
    const dayKey = cursor.toISOString().slice(0, 10);
    buckets.set(dayKey, {
      day_key: dayKey,
      label: formatDayLabel(dayKey),
      requests: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_spend_usd: 0,
    });
  }

  for (const record of records) {
    const dayKey = toUtcDayKey(record.created_at);
    const bucket = buckets.get(dayKey);
    if (!bucket) {
      continue;
    }

    const promptTokens = record.prompt_tokens ?? 0;
    const completionTokens = record.completion_tokens ?? 0;
    const totalTokens =
      record.total_tokens ?? promptTokens + completionTokens;

    bucket.requests += 1;
    bucket.prompt_tokens += promptTokens;
    bucket.completion_tokens += completionTokens;
    bucket.total_tokens += totalTokens;
    bucket.estimated_spend_usd += estimateCloudflareAiSpendUsd({
      promptTokens,
      completionTokens,
    });
  }

  return [...buckets.values()];
}

export function summarizeCloudflareAiUsageSeries(
  series: CloudflareAiUsageDailyPoint[]
) {
  return series.reduce(
    (acc, point) => {
      acc.requests += point.requests;
      acc.total_tokens += point.total_tokens;
      acc.estimated_spend_usd += point.estimated_spend_usd;
      return acc;
    },
    { requests: 0, total_tokens: 0, estimated_spend_usd: 0 }
  );
}

export function formatEstimatedUsd(value: number): string {
  if (value > 0 && value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(2)}`;
}

export function cloudflareAiPricingModelLabel(
  model = SCHEDULE_ASSISTANT_DEFAULT_MODEL
): string {
  return model;
}
