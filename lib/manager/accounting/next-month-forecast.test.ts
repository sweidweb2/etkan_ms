import { describe, expect, it } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  averageMonthlyCredits,
  expectedSppAmountForMonth,
  lastCompletedMonthsRange,
  nextMonthStart,
  phaseRunsInMonth,
} from "@/lib/manager/accounting/next-month-forecast";

const on = (value: string) => Temporal.PlainDate.from(value);

// 1000 over 4 months, upfront 200, running Mar 10 - Jul 10.
const phase = {
  status: "opened",
  start_date: "2026-03-10",
  end_date: "2026-07-10",
  upfront_amount: 200,
  duration_months: 4,
};

describe("nextMonthStart", () => {
  it("returns the first day of next month with a readable label", () => {
    const next = nextMonthStart(on("2026-09-17"));

    expect(next.monthStart.toString()).toBe("2026-10-01");
    expect(next.label).toBe("October 2026");
  });

  it("rolls over the year", () => {
    const next = nextMonthStart(on("2026-12-31"));

    expect(next.monthStart.toString()).toBe("2027-01-01");
    expect(next.label).toBe("January 2027");
  });
});

describe("phaseRunsInMonth", () => {
  it("includes a phase ending during or after the month", () => {
    expect(phaseRunsInMonth(phase, on("2026-06-01"))).toBe(true);
    expect(phaseRunsInMonth(phase, on("2026-07-01"))).toBe(true);
  });

  it("excludes a phase that ended before the month starts", () => {
    expect(phaseRunsInMonth(phase, on("2026-08-01"))).toBe(false);
  });

  it("excludes a phase with an unparsable end date", () => {
    expect(phaseRunsInMonth({ end_date: "" }, on("2026-06-01"))).toBe(false);
  });
});

describe("expectedSppAmountForMonth", () => {
  it("expects nothing from a settled student", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 0, final_amount_due: 1000 },
        phase,
        on("2026-06-01")
      )
    ).toBe(0);
  });

  it("expects one monthly installment mid-phase", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 800, final_amount_due: 1000 },
        phase,
        on("2026-06-01")
      )
    ).toBe(250);
  });

  it("caps at the remaining amount when it is below one installment", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 60, final_amount_due: 1000 },
        phase,
        on("2026-06-01")
      )
    ).toBe(60);
  });

  it("expects the upfront when the month is the phase's first month", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 1000, final_amount_due: 1000 },
        { ...phase, start_date: "2026-06-05" },
        on("2026-06-01")
      )
    ).toBe(200);
  });

  it("expects the upfront only in the starting month, not the one after", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 1000, final_amount_due: 1000 },
        { ...phase, start_date: "2026-06-05" },
        on("2026-07-01")
      )
    ).toBe(250);
  });

  it("falls back to the installment when the first month has no upfront", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 1000, final_amount_due: 1000 },
        { ...phase, start_date: "2026-06-05", upfront_amount: 0 },
        on("2026-06-01")
      )
    ).toBe(250);
  });

  it("applies adjustments through final_amount_due", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 600, final_amount_due: 600 },
        phase,
        on("2026-06-01")
      )
    ).toBe(150);
  });

  it("never divides by zero on a malformed duration", () => {
    expect(
      expectedSppAmountForMonth(
        { remaining_amount: 800, final_amount_due: 1000 },
        { ...phase, duration_months: 0 },
        on("2026-06-01")
      )
    ).toBe(800);
  });
});

describe("averageMonthlyCredits", () => {
  it("averages credits and ignores debits", () => {
    const rows = [
      { type: "credit", amount: 300 },
      { type: "debit", amount: 900 },
      { type: "credit", amount: 600 },
    ];

    expect(averageMonthlyCredits(rows, 3)).toBe(300);
  });

  it("returns zero without credits and never divides by zero", () => {
    expect(averageMonthlyCredits([], 3)).toBe(0);
    expect(averageMonthlyCredits([{ type: "credit", amount: 50 }], 0)).toBe(50);
  });
});

describe("lastCompletedMonthsRange", () => {
  it("covers the completed months before the current one", () => {
    expect(lastCompletedMonthsRange(3, on("2026-09-17"))).toEqual({
      fromInclusive: "2026-06-01",
      toExclusive: "2026-09-01",
    });
  });

  it("rolls back across the year boundary", () => {
    expect(lastCompletedMonthsRange(3, on("2027-01-05"))).toEqual({
      fromInclusive: "2026-10-01",
      toExclusive: "2027-01-01",
    });
  });
});
