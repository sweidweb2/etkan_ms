import { describe, expect, it } from "vitest";
import {
  buildCloudflareAiUsageDailySeries,
  estimateCloudflareAiSpendUsd,
  formatEstimatedUsd,
} from "@/lib/manager/cloudflare-ai-usage-analytics";
import type { ManagerCloudflareAiUsageRow } from "@/types/manager-cloudflare-ai-usage";

function row(
  overrides: Partial<ManagerCloudflareAiUsageRow>
): ManagerCloudflareAiUsageRow {
  return {
    id: "1",
    created_at: "2026-08-03T12:00:00.000Z",
    user_id: null,
    user_label: "manager",
    feature: "schedule_assistant",
    model: "@cf/nvidia/nemotron-3-120b-a12b",
    prompt: "Who teaches Python?",
    response: "asweid: Python",
    status: "success",
    error_message: null,
    prompt_tokens: 1000,
    completion_tokens: 500,
    total_tokens: 1500,
    tool_rounds: 1,
    metadata: null,
    ...overrides,
  };
}

describe("estimateCloudflareAiSpendUsd", () => {
  it("prices 1M input + 1M output at published rates", () => {
    expect(
      estimateCloudflareAiSpendUsd({
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
      })
    ).toBeCloseTo(2.0, 6);
  });
});

describe("buildCloudflareAiUsageDailySeries", () => {
  it("fills continuous days and aggregates tokens/spend", () => {
    const series = buildCloudflareAiUsageDailySeries(
      [
        row({
          id: "a",
          created_at: "2026-08-03T10:00:00.000Z",
          prompt_tokens: 1000,
          completion_tokens: 0,
          total_tokens: 1000,
        }),
        row({
          id: "b",
          created_at: "2026-08-03T18:00:00.000Z",
          prompt_tokens: 500,
          completion_tokens: 500,
          total_tokens: 1000,
        }),
        row({
          id: "c",
          created_at: "2026-07-20T12:00:00.000Z",
          total_tokens: 9999,
        }),
      ],
      3,
      new Date("2026-08-03T20:00:00.000Z")
    );

    expect(series).toHaveLength(3);
    expect(series.map((p) => p.day_key)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
    const today = series[2]!;
    expect(today.requests).toBe(2);
    expect(today.total_tokens).toBe(2000);
    expect(today.estimated_spend_usd).toBeGreaterThan(0);
  });
});

describe("formatEstimatedUsd", () => {
  it("shows more precision for tiny amounts", () => {
    expect(formatEstimatedUsd(0.0012)).toBe("$0.0012");
    expect(formatEstimatedUsd(1.2)).toBe("$1.20");
  });
});
