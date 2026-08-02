import { describe, expect, it } from "vitest";
import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";
import {
  assertWorkshopStatusTransition,
  canCancelWorkshopStatus,
  canReopenWorkshopFromCancelled,
  formatLocalDateYmd,
  getNextWorkshopStatus,
  getPreviousWorkshopStatus,
} from "@/lib/manager/workshops/status-transitions";

describe("getNextWorkshopStatus / getPreviousWorkshopStatus", () => {
  it("returns adjacent flow statuses", () => {
    expect(getNextWorkshopStatus(WORKSHOP_STATUSES.DRAFT)).toBe(
      WORKSHOP_STATUSES.PROPOSAL
    );
    expect(getPreviousWorkshopStatus(WORKSHOP_STATUSES.PROPOSAL)).toBe(
      WORKSHOP_STATUSES.DRAFT
    );
    expect(getNextWorkshopStatus(WORKSHOP_STATUSES.COMPLETED)).toBeNull();
    expect(getPreviousWorkshopStatus(WORKSHOP_STATUSES.DRAFT)).toBeNull();
    expect(getNextWorkshopStatus(WORKSHOP_STATUSES.CANCELLED)).toBeNull();
  });
});

describe("canCancelWorkshopStatus / canReopenWorkshopFromCancelled", () => {
  it("allows cancel from in-flow non-completed statuses", () => {
    expect(canCancelWorkshopStatus(WORKSHOP_STATUSES.DRAFT)).toBe(true);
    expect(canCancelWorkshopStatus(WORKSHOP_STATUSES.IN_PROGRESS)).toBe(true);
    expect(canCancelWorkshopStatus(WORKSHOP_STATUSES.COMPLETED)).toBe(false);
    expect(canCancelWorkshopStatus(WORKSHOP_STATUSES.CANCELLED)).toBe(false);
  });

  it("allows reopen only from cancelled", () => {
    expect(canReopenWorkshopFromCancelled(WORKSHOP_STATUSES.CANCELLED)).toBe(
      true
    );
    expect(canReopenWorkshopFromCancelled(WORKSHOP_STATUSES.DRAFT)).toBe(false);
  });
});

describe("assertWorkshopStatusTransition", () => {
  const today = "2026-08-03";

  it("allows adjacent next and back", () => {
    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.DRAFT,
        to: WORKSHOP_STATUSES.PROPOSAL,
        startDate: null,
        endDate: null,
        today,
      })
    ).toEqual({ ok: true });

    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.PROPOSAL,
        to: WORKSHOP_STATUSES.DRAFT,
        startDate: null,
        endDate: null,
        today,
      })
    ).toEqual({ ok: true });
  });

  it("rejects non-adjacent jumps", () => {
    const result = assertWorkshopStatusTransition({
      from: WORKSHOP_STATUSES.DRAFT,
      to: WORKSHOP_STATUSES.IN_PROGRESS,
      startDate: "2026-09-01",
      endDate: null,
      today,
    });
    expect(result.ok).toBe(false);
  });

  it("requires future start_date when moving to scheduled", () => {
    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.PROPOSAL,
        to: WORKSHOP_STATUSES.SCHEDULED,
        startDate: null,
        endDate: null,
        today,
      }).ok
    ).toBe(false);

    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.PROPOSAL,
        to: WORKSHOP_STATUSES.SCHEDULED,
        startDate: "2026-08-03",
        endDate: null,
        today,
      }).ok
    ).toBe(false);

    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.PROPOSAL,
        to: WORKSHOP_STATUSES.SCHEDULED,
        startDate: "2026-08-04",
        endDate: "2026-08-10",
        today,
      })
    ).toEqual({ ok: true });
  });

  it("allows cancel and reopen as draft", () => {
    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.SCHEDULED,
        to: WORKSHOP_STATUSES.CANCELLED,
        startDate: "2026-09-01",
        endDate: null,
        today,
      })
    ).toEqual({ ok: true });

    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.CANCELLED,
        to: WORKSHOP_STATUSES.DRAFT,
        startDate: null,
        endDate: null,
        today,
      })
    ).toEqual({ ok: true });

    expect(
      assertWorkshopStatusTransition({
        from: WORKSHOP_STATUSES.CANCELLED,
        to: WORKSHOP_STATUSES.PROPOSAL,
        startDate: null,
        endDate: null,
        today,
      }).ok
    ).toBe(false);
  });

  it("formats local YYYY-MM-DD", () => {
    expect(formatLocalDateYmd(new Date(2026, 7, 3))).toBe("2026-08-03");
  });
});
