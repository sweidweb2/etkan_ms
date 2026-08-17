import { describe, expect, it } from "vitest";
import { latestRecordedPipelineStatus } from "@/lib/manager/guests/resolve-guest-current-status";

describe("latestRecordedPipelineStatus", () => {
  it("returns the newest pipeline status", () => {
    expect(
      latestRecordedPipelineStatus([
        { status: "started", created_at: "2026-01-01T00:00:00.000Z" },
        { status: "chose_plan", created_at: "2026-01-03T00:00:00.000Z" },
        {
          status: "finished_meeting",
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ])
    ).toBe("chose_plan");
  });

  it("returns null when no pipeline events exist", () => {
    expect(latestRecordedPipelineStatus([])).toBeNull();
  });
});
