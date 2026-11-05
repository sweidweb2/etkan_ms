import { describe, expect, it } from "vitest";
import {
  SEMESTER_DROP_REFUND_STATUSES,
  SEMESTER_DROP_REQUEST_STATUSES,
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import {
  SPP_ADJUSTMENT_LOCK_MESSAGES,
  SPP_PAYMENT_LOCK_MESSAGES,
} from "@/lib/manager/accounting/semester-drop-messages";
import {
  applyDropOverlayToSppFlags,
  deriveDropOverlay,
  deriveSppLocks,
} from "@/lib/manager/accounting/semester-drop-status";
import { remainingDropRefund } from "@/lib/manager/accounting/semester-drop-mapper";

describe("deriveSppLocks", () => {
  it("blocks payments and adjustments when drop completed", () => {
    expect(
      deriveSppLocks({
        phaseStatus: PAYMENT_PHASE_STATUSES.OPENED,
        sppStatus: STUDENT_PAYMENT_PHASE_STATUSES.PARTIALLY_PAID,
        dropCompleted: true,
      })
    ).toEqual({
      payments_blocked: true,
      adjustments_blocked: true,
      schedule_editable: false,
    });
  });

  it("blocks payments but not adjustments when spp is paid", () => {
    expect(
      deriveSppLocks({
        phaseStatus: PAYMENT_PHASE_STATUSES.OPENED,
        sppStatus: STUDENT_PAYMENT_PHASE_STATUSES.PAID,
        dropCompleted: false,
      })
    ).toEqual({
      payments_blocked: true,
      adjustments_blocked: false,
      schedule_editable: false,
    });
  });
});

describe("deriveDropOverlay", () => {
  it("marks done_paid only when refund is not owed", () => {
    const droppedSettled = deriveDropOverlay(
      {
        id: "d1",
        status: SEMESTER_DROP_REQUEST_STATUSES.COMPLETED,
        refund_status: SEMESTER_DROP_REFUND_STATUSES.PROCESSED,
      },
      false
    );
    expect(applyDropOverlayToSppFlags(droppedSettled)).toMatchObject({
      drop_dropped: true,
      drop_done_paid: true,
      drop_refund_owed: false,
    });

    const droppedOwing = deriveDropOverlay(
      {
        id: "d2",
        status: SEMESTER_DROP_REQUEST_STATUSES.COMPLETED,
        refund_status: SEMESTER_DROP_REFUND_STATUSES.OWED,
      },
      false
    );
    expect(applyDropOverlayToSppFlags(droppedOwing)).toMatchObject({
      drop_dropped: true,
      drop_done_paid: false,
      drop_refund_owed: true,
    });
  });

  it("keeps pending distinct from completed", () => {
    expect(
      deriveDropOverlay(
        {
          id: "d3",
          status: SEMESTER_DROP_REQUEST_STATUSES.PENDING,
          refund_status: SEMESTER_DROP_REFUND_STATUSES.NONE,
        },
        true
      )
    ).toMatchObject({
      pending: true,
      dropped: false,
      done_paid: false,
    });
  });
});

describe("drop message constants", () => {
  it("keeps lock message wording stable for SQL parity", () => {
    expect(SPP_PAYMENT_LOCK_MESSAGES.DROP_COMPLETED).toContain(
      "completed semester drop"
    );
    expect(SPP_ADJUSTMENT_LOCK_MESSAGES.DROP_COMPLETED).toContain(
      "completed semester drop"
    );
  });

  it("computes remaining refund", () => {
    expect(remainingDropRefund(80, 30)).toBe(50);
    expect(remainingDropRefund(40, 50)).toBe(0);
  });
});
