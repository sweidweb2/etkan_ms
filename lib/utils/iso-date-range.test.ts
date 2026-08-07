import { describe, expect, it } from "vitest";
import {
  dateRangeForYearMonth,
  yearsFromDateBounds,
} from "@/lib/utils/iso-date-range";

describe("dateRangeForYearMonth", () => {
  it("covers a full year when month is null", () => {
    expect(dateRangeForYearMonth(2026, null)).toEqual({
      fromInclusive: "2026-01-01",
      toExclusive: "2027-01-01",
    });
  });

  it("covers a single month with exclusive end", () => {
    expect(dateRangeForYearMonth(2026, 8)).toEqual({
      fromInclusive: "2026-08-01",
      toExclusive: "2026-09-01",
    });
  });

  it("rolls December into the next year", () => {
    expect(dateRangeForYearMonth(2026, 12)).toEqual({
      fromInclusive: "2026-12-01",
      toExclusive: "2027-01-01",
    });
  });
});

describe("yearsFromDateBounds", () => {
  it("fills years between min and max and includes current year", () => {
    expect(
      yearsFromDateBounds(
        [
          { min: "2024-03-01", max: "2025-11-01" },
          { min: null, max: null },
        ],
        2026
      )
    ).toEqual([2026, 2025, 2024]);
  });

  it("returns only the current year when bounds are empty", () => {
    expect(yearsFromDateBounds([null, { min: null, max: null }], 2026)).toEqual(
      [2026]
    );
  });
});
