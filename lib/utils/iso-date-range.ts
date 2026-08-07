/**
 * Inclusive start / exclusive end ISO date bounds (YYYY-MM-DD) for ledger queries.
 */
export type IsoDateRange = {
  fromInclusive: string;
  toExclusive: string;
};

export function dateRangeForYearMonth(
  year: number,
  month: number | null
): IsoDateRange {
  if (month === null) {
    return {
      fromInclusive: `${year}-01-01`,
      toExclusive: `${year + 1}-01-01`,
    };
  }

  const monthPad = String(month).padStart(2, "0");
  const fromInclusive = `${year}-${monthPad}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const toExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return { fromInclusive, toExclusive };
}

export function yearsFromDateBounds(
  bounds: Array<{ min: string | null; max: string | null } | null>,
  currentYear: number
): number[] {
  const years = new Set<number>([currentYear]);

  for (const bound of bounds) {
    if (!bound) continue;
    for (const value of [bound.min, bound.max]) {
      if (!value) continue;
      const year = Number(value.slice(0, 4));
      if (Number.isFinite(year)) {
        years.add(year);
      }
    }
  }

  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return [currentYear];
  }

  const filled = new Set<number>();
  for (let year = sorted[0]; year <= sorted[sorted.length - 1]; year += 1) {
    filled.add(year);
  }
  filled.add(currentYear);

  return [...filled].sort((a, b) => b - a);
}
