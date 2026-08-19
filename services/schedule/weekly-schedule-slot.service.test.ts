import { describe, expect, it, vi, beforeEach } from "vitest";
import * as weeklyScheduleSlotRepository from "@/repositories/weekly-schedule-slot.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import { copyLastWeekScheduleForManager } from "@/services/schedule/weekly-schedule-slot.service";

vi.mock("@/repositories/weekly-schedule-slot.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/auth/authorization.service", () => ({
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const okResult = {
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

describe("copyLastWeekScheduleForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses the copy RPC instead of per-slot REST inserts", async () => {
    vi.mocked(
      weeklyScheduleSlotRepository.listWeeklyScheduleSlotsInDateRange
    )
      .mockResolvedValueOnce({
        data: [
          {
            id: "slot-last",
            name: "Math",
            type: "class",
            slot_date: "2026-01-05",
            start_time: "09:00:00",
            end_time: "10:00:00",
            color: "#dbeafe",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        ...okResult,
      })
      .mockResolvedValueOnce({
        data: [],
        ...okResult,
      });
    vi.mocked(
      weeklyScheduleSlotRepository.copyWeeklyScheduleFromLastWeek
    ).mockResolvedValue({
      data: { created_count: 1, skipped_count: 0 },
      error: null,
    });

    const result = await copyLastWeekScheduleForManager(
      adminClient,
      actor.userId,
      actor,
      "2026-01-12"
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.createdCount).toBe(1);
    }
    expect(
      weeklyScheduleSlotRepository.copyWeeklyScheduleFromLastWeek
    ).toHaveBeenCalledWith(adminClient, "2026-01-11");
    expect(
      weeklyScheduleSlotRepository.createWeeklyScheduleSlots
    ).not.toHaveBeenCalled();
  });
});
