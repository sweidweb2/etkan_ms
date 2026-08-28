import { describe, expect, it } from "vitest";
import { resolveSppDisplayStatus } from "@/lib/manager/accounting/spp-display-status";

const activeWindow = { upfrontWindowActive: true, upfrontAmount: 100 };

describe("resolveSppDisplayStatus", () => {
  it("marks upfront payers during the window", () => {
    expect(
      resolveSppDisplayStatus(
        { status: "partially_paid", totalPaid: 100 },
        activeWindow
      )
    ).toBe("upfront_paid");
  });

  it("keeps the persisted status below the upfront amount", () => {
    expect(
      resolveSppDisplayStatus(
        { status: "partially_paid", totalPaid: 99 },
        activeWindow
      )
    ).toBe("partially_paid");
    expect(
      resolveSppDisplayStatus({ status: "pending", totalPaid: 0 }, activeWindow)
    ).toBe("pending");
  });

  it("leaves paid and cancelled alone", () => {
    expect(
      resolveSppDisplayStatus({ status: "paid", totalPaid: 500 }, activeWindow)
    ).toBe("paid");
    expect(
      resolveSppDisplayStatus(
        { status: "cancelled", totalPaid: 500 },
        activeWindow
      )
    ).toBe("cancelled");
  });

  it("keeps the persisted status outside the window or without an upfront", () => {
    expect(
      resolveSppDisplayStatus(
        { status: "partially_paid", totalPaid: 100 },
        { upfrontWindowActive: false, upfrontAmount: 100 }
      )
    ).toBe("partially_paid");
    expect(
      resolveSppDisplayStatus(
        { status: "partially_paid", totalPaid: 100 },
        { upfrontWindowActive: true, upfrontAmount: 0 }
      )
    ).toBe("partially_paid");
  });
});
