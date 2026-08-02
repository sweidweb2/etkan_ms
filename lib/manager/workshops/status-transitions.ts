import {
  WORKSHOP_STATUSES,
  WORKSHOP_STATUS_FLOW,
  type WorkshopStatusFlowValue,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";

export type WorkshopStatusTransitionInput = {
  from: WorkshopStatusValue;
  to: WorkshopStatusValue;
  startDate: string | null;
  endDate: string | null;
  /** Local calendar date as YYYY-MM-DD. */
  today: string;
};

export type WorkshopStatusTransitionResult =
  | { ok: true }
  | { ok: false; error: string };

function flowIndex(status: WorkshopStatusValue): number {
  return WORKSHOP_STATUS_FLOW.indexOf(status as WorkshopStatusFlowValue);
}

export function getNextWorkshopStatus(
  current: WorkshopStatusValue
): WorkshopStatusFlowValue | null {
  const index = flowIndex(current);
  if (index < 0 || index >= WORKSHOP_STATUS_FLOW.length - 1) {
    return null;
  }
  return WORKSHOP_STATUS_FLOW[index + 1]!;
}

export function getPreviousWorkshopStatus(
  current: WorkshopStatusValue
): WorkshopStatusFlowValue | null {
  const index = flowIndex(current);
  if (index <= 0) {
    return null;
  }
  return WORKSHOP_STATUS_FLOW[index - 1]!;
}

/** Cancel allowed from any in-flow status except completed (and not already cancelled). */
export function canCancelWorkshopStatus(current: WorkshopStatusValue): boolean {
  if (current === WORKSHOP_STATUSES.CANCELLED) {
    return false;
  }
  if (current === WORKSHOP_STATUSES.COMPLETED) {
    return false;
  }
  return flowIndex(current) >= 0;
}

export function canReopenWorkshopFromCancelled(
  current: WorkshopStatusValue
): boolean {
  return current === WORKSHOP_STATUSES.CANCELLED;
}

function isAdjacentFlowMove(
  from: WorkshopStatusValue,
  to: WorkshopStatusValue
): boolean {
  const fromIndex = flowIndex(from);
  const toIndex = flowIndex(to);
  if (fromIndex < 0 || toIndex < 0) {
    return false;
  }
  return Math.abs(fromIndex - toIndex) === 1;
}

function assertScheduledDateRules(
  startDate: string | null,
  endDate: string | null,
  today: string
): WorkshopStatusTransitionResult {
  if (!startDate) {
    return {
      ok: false,
      error: "Set a start date before moving to scheduled.",
    };
  }

  if (startDate <= today) {
    return {
      ok: false,
      error: "Start date must be in the future to move to scheduled.",
    };
  }

  if (endDate && endDate < startDate) {
    return {
      ok: false,
      error: "End date must be on or after start date.",
    };
  }

  return { ok: true };
}

export function assertWorkshopStatusTransition(
  input: WorkshopStatusTransitionInput
): WorkshopStatusTransitionResult {
  const { from, to, startDate, endDate, today } = input;

  if (from === to) {
    return { ok: false, error: "Workshop is already in that status." };
  }

  if (to === WORKSHOP_STATUSES.CANCELLED) {
    if (!canCancelWorkshopStatus(from)) {
      return {
        ok: false,
        error: "This workshop cannot be cancelled from its current status.",
      };
    }
    return { ok: true };
  }

  if (from === WORKSHOP_STATUSES.CANCELLED) {
    if (to !== WORKSHOP_STATUSES.DRAFT) {
      return {
        ok: false,
        error: "Cancelled workshops can only be reopened as draft.",
      };
    }
    return { ok: true };
  }

  if (!isAdjacentFlowMove(from, to)) {
    return {
      ok: false,
      error: "Status can only move one step forward or backward.",
    };
  }

  if (to === WORKSHOP_STATUSES.SCHEDULED) {
    return assertScheduledDateRules(startDate, endDate, today);
  }

  return { ok: true };
}

/** Format a Date as local YYYY-MM-DD. */
export function formatLocalDateYmd(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
