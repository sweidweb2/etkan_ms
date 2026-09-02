import { describe, expect, it } from "vitest";
import {
  buildMonthTicks,
  buildTimelineDomain,
  colorForPhaseId,
  dateToPercent,
  filterOpenPhases,
  parseTimelineDate,
  phaseBarLayout,
  toTimelineIsoDate,
} from "@/lib/manager/accounting/payment-phase-timeline";
import type { ManagerPaymentPhaseRow } from "@/types/manager-payment-phase";

function phase(
  overrides: Partial<ManagerPaymentPhaseRow> &
    Pick<ManagerPaymentPhaseRow, "id" | "name" | "start_date" | "end_date" | "status">
): ManagerPaymentPhaseRow {
  return {
    semester_id: "sem-1",
    semester_name: "Fall",
    semester_code: "F26",
    billing_class_id: null,
    billing_class_name: null,
    amount: 1000,
    upfront_amount: 100,
    duration_months: 3,
    created_at: "2026-01-01T00:00:00Z",
    spp_active_count: 1,
    spp_paid_count: 0,
    upfront_window_active: false,
    ...overrides,
  };
}

describe("parseTimelineDate / toTimelineIsoDate", () => {
  it("parses local calendar dates and round-trips", () => {
    const date = parseTimelineDate("2026-03-10");
    expect(date).not.toBeNull();
    expect(toTimelineIsoDate(date!)).toBe("2026-03-10");
  });

  it("accepts timestamp prefixes and rejects invalid values", () => {
    expect(toTimelineIsoDate(parseTimelineDate("2026-03-10T12:00:00Z")!)).toBe(
      "2026-03-10"
    );
    expect(parseTimelineDate("not-a-date")).toBeNull();
    expect(parseTimelineDate("2026-02-30")).toBeNull();
  });
});

describe("filterOpenPhases", () => {
  it("keeps only opened phases sorted by start then name", () => {
    const rows = [
      phase({
        id: "c",
        name: "Charlie",
        status: "opened",
        start_date: "2026-02-01",
        end_date: "2026-04-01",
      }),
      phase({
        id: "a",
        name: "Alpha",
        status: "closed",
        start_date: "2026-01-01",
        end_date: "2026-03-01",
      }),
      phase({
        id: "b",
        name: "Bravo",
        status: "opened",
        start_date: "2026-02-01",
        end_date: "2026-05-01",
      }),
      phase({
        id: "d",
        name: "Delta",
        status: "cancelled",
        start_date: "2026-01-15",
        end_date: "2026-02-15",
      }),
    ];

    expect(filterOpenPhases(rows).map((row) => row.id)).toEqual(["b", "c"]);
  });
});

describe("buildTimelineDomain", () => {
  it("snaps outward to month bounds and includes today", () => {
    const domain = buildTimelineDomain(
      [
        { start_date: "2026-03-10", end_date: "2026-05-20" },
      ],
      new Date(2026, 3, 15)
    );

    expect(domain).toEqual({
      domainStart: "2026-03-01",
      domainEnd: "2026-05-31",
    });
  });

  it("extends the domain when today is outside phase ranges", () => {
    const domain = buildTimelineDomain(
      [
        { start_date: "2026-01-10", end_date: "2026-02-20" },
      ],
      new Date(2026, 5, 15)
    );

    expect(domain).toEqual({
      domainStart: "2026-01-01",
      domainEnd: "2026-06-30",
    });
  });

  it("still builds a domain from today alone", () => {
    const domain = buildTimelineDomain([], new Date(2026, 8, 2));
    expect(domain).toEqual({
      domainStart: "2026-09-01",
      domainEnd: "2026-09-30",
    });
  });
});

describe("dateToPercent", () => {
  const domain = {
    domainStart: "2026-01-01",
    domainEnd: "2026-01-11",
  };

  it("maps domain ends to 0 and 100", () => {
    expect(dateToPercent("2026-01-01", domain)).toBe(0);
    expect(dateToPercent("2026-01-11", domain)).toBe(100);
  });

  it("clamps values outside the domain", () => {
    expect(dateToPercent("2025-12-01", domain)).toBe(0);
    expect(dateToPercent("2026-02-01", domain)).toBe(100);
  });
});

describe("phaseBarLayout", () => {
  const domain = {
    domainStart: "2026-01-01",
    domainEnd: "2026-01-11",
  };

  it("places an inclusive bar as percentages", () => {
    const layout = phaseBarLayout(
      { start_date: "2026-01-03", end_date: "2026-01-05" },
      domain
    );

    expect(layout).not.toBeNull();
    // 2 days offset → 20%; inclusive width 3 days → 30%
    expect(layout!.leftPercent).toBeCloseTo(20);
    expect(layout!.widthPercent).toBeCloseTo(30);
  });

  it("keeps a visible width for same-day ranges", () => {
    const layout = phaseBarLayout(
      { start_date: "2026-01-05", end_date: "2026-01-05" },
      domain
    );

    expect(layout).not.toBeNull();
    expect(layout!.widthPercent).toBeGreaterThan(0);
  });
});

describe("buildMonthTicks", () => {
  it("emits month labels across the domain", () => {
    const ticks = buildMonthTicks({
      domainStart: "2026-01-01",
      domainEnd: "2026-03-31",
    });

    expect(ticks.map((tick) => tick.label)).toEqual([
      "Jan 2026",
      "Feb 2026",
      "Mar 2026",
    ]);
    expect(ticks[0]?.percent).toBe(0);
  });
});

describe("colorForPhaseId", () => {
  it("returns a stable color for the same id", () => {
    expect(colorForPhaseId("phase-abc")).toEqual(colorForPhaseId("phase-abc"));
  });

  it("can return different colors for different ids", () => {
    const a = colorForPhaseId("phase-a");
    const b = colorForPhaseId("phase-b");
    // Not guaranteed distinct for every pair, but these two hashes differ.
    expect(a).not.toEqual(b);
  });
});
