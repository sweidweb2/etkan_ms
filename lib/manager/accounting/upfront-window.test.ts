import { describe, expect, it } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  countsAsUpfrontPaid,
  isPhaseUpfrontWindowActive,
} from "@/lib/manager/accounting/upfront-window";

const openedPhase = {
  status: "opened",
  start_date: "2026-03-10",
  upfront_amount: 100,
};

const on = (value: string) => Temporal.PlainDate.from(value);

describe("isPhaseUpfrontWindowActive", () => {
  it("is active on the start date", () => {
    expect(isPhaseUpfrontWindowActive(openedPhase, on("2026-03-10"))).toBe(true);
  });

  it("is active inside the first month", () => {
    expect(isPhaseUpfrontWindowActive(openedPhase, on("2026-04-09"))).toBe(true);
  });

  it("is inactive on the exclusive end boundary", () => {
    expect(isPhaseUpfrontWindowActive(openedPhase, on("2026-04-10"))).toBe(
      false
    );
  });

  it("is inactive before the start date", () => {
    expect(isPhaseUpfrontWindowActive(openedPhase, on("2026-03-09"))).toBe(
      false
    );
  });

  it("constrains month-end start dates", () => {
    const phase = { ...openedPhase, start_date: "2026-01-31" };

    expect(isPhaseUpfrontWindowActive(phase, on("2026-02-27"))).toBe(true);
    expect(isPhaseUpfrontWindowActive(phase, on("2026-02-28"))).toBe(false);
  });

  it("is inactive without an upfront amount", () => {
    expect(
      isPhaseUpfrontWindowActive(
        { ...openedPhase, upfront_amount: 0 },
        on("2026-03-15")
      )
    ).toBe(false);
  });

  it("is inactive for closed and cancelled phases", () => {
    expect(
      isPhaseUpfrontWindowActive(
        { ...openedPhase, status: "closed" },
        on("2026-03-15")
      )
    ).toBe(false);
    expect(
      isPhaseUpfrontWindowActive(
        { ...openedPhase, status: "cancelled" },
        on("2026-03-15")
      )
    ).toBe(false);
  });

  it("accepts timestamp start dates and rejects unparsable ones", () => {
    expect(
      isPhaseUpfrontWindowActive(
        { ...openedPhase, start_date: "2026-03-10T00:00:00Z" },
        on("2026-03-15")
      )
    ).toBe(true);
    expect(
      isPhaseUpfrontWindowActive(
        { ...openedPhase, start_date: "not-a-date" },
        on("2026-03-15")
      )
    ).toBe(false);
  });
});

describe("countsAsUpfrontPaid", () => {
  it("counts students who reached the upfront amount", () => {
    expect(
      countsAsUpfrontPaid({
        status: "partially_paid",
        totalPaid: 100,
        upfrontAmount: 100,
      })
    ).toBe(true);
  });

  it("does not count students below the upfront amount", () => {
    expect(
      countsAsUpfrontPaid({
        status: "partially_paid",
        totalPaid: 99,
        upfrontAmount: 100,
      })
    ).toBe(false);
    expect(
      countsAsUpfrontPaid({
        status: "pending",
        totalPaid: 0,
        upfrontAmount: 100,
      })
    ).toBe(false);
  });

  it("counts fully paid students even when a discount kept them under the upfront", () => {
    expect(
      countsAsUpfrontPaid({ status: "paid", totalPaid: 40, upfrontAmount: 100 })
    ).toBe(true);
  });

  it("never counts cancelled students", () => {
    expect(
      countsAsUpfrontPaid({
        status: "cancelled",
        totalPaid: 500,
        upfrontAmount: 100,
      })
    ).toBe(false);
  });
});
