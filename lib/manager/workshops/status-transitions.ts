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

function isFlowStatus(status: WorkshopStatusValue): boolean {
  return flowIndex(status) >= 0;
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

/** Cancelled or completed workshops cannot mutate sessions, instructors, documents, payments, or schedule slots. */
export const WORKSHOP_CONTENT_LOCKED_MESSAGE =
  "This workshop is cancelled or completed. Sessions, instructors, documents, payments, and schedule slots cannot be changed.";

export function isWorkshopContentMutationLocked(status: string): boolean {
  return (
    status === WORKSHOP_STATUSES.COMPLETED ||
    status === WORKSHOP_STATUSES.CANCELLED
  );
}

export function assertWorkshopStatusTransition(
  input: WorkshopStatusTransitionInput
): WorkshopStatusTransitionResult {
  const { from, to } = input;

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

  // Any lifecycle checkpoint (including jumps), or reopen from cancelled to any checkpoint.
  if (isFlowStatus(to) && (isFlowStatus(from) || from === WORKSHOP_STATUSES.CANCELLED)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "Invalid workshop status change.",
  };
}

/** Format a Date as local YYYY-MM-DD. */
export function formatLocalDateYmd(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
