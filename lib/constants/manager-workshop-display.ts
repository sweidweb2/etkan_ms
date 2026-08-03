import type { WorkshopStatusValue } from "@/lib/constants/manager-workshop-status";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_VALUES,
  type PaymentMethod,
  type TransactionType,
} from "@/lib/manager/accounting/constants";

export const WORKSHOP_OFFERING_TYPES = {
  COURSE: "course",
  ONLINE: "online",
  WORKSHOP: "workshop",
} as const;

export type WorkshopOfferingType =
  (typeof WORKSHOP_OFFERING_TYPES)[keyof typeof WORKSHOP_OFFERING_TYPES];

export const WORKSHOP_OFFERING_TYPE_VALUES = [
  WORKSHOP_OFFERING_TYPES.COURSE,
  WORKSHOP_OFFERING_TYPES.ONLINE,
  WORKSHOP_OFFERING_TYPES.WORKSHOP,
] as const;

export const WORKSHOP_OFFERING_TYPE_LABELS: Record<
  WorkshopOfferingType,
  string
> = {
  course: "Course",
  online: "Online",
  workshop: "Workshop",
};

export const MANAGER_WORKSHOP_STATUS_LABELS: Record<WorkshopStatusValue, string> =
  {
    draft: "Draft",
    proposal: "Proposal",
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

export const MANAGER_WORKSHOP_STATUS_BADGE_CLASSES: Record<
  WorkshopStatusValue,
  string
> = {
  draft: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
  proposal: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export const WORKSHOP_INSTRUCTOR_ROLES = {
  LEAD: "lead",
  ASSISTANT: "assistant",
  GUEST: "guest",
} as const;

export type WorkshopInstructorRole =
  (typeof WORKSHOP_INSTRUCTOR_ROLES)[keyof typeof WORKSHOP_INSTRUCTOR_ROLES];

export const WORKSHOP_INSTRUCTOR_ROLE_VALUES = Object.values(
  WORKSHOP_INSTRUCTOR_ROLES
);

export const WORKSHOP_INSTRUCTOR_ROLE_LABELS: Record<
  WorkshopInstructorRole,
  string
> = {
  lead: "Lead",
  assistant: "Assistant",
  guest: "Guest",
};

export const WORKSHOP_WAGE_TYPES = {
  FIXED: "fixed",
  PER_SESSION: "per_session",
  PERCENTAGE: "percentage",
} as const;

export type WorkshopWageType =
  (typeof WORKSHOP_WAGE_TYPES)[keyof typeof WORKSHOP_WAGE_TYPES];

export const WORKSHOP_WAGE_TYPE_VALUES = Object.values(WORKSHOP_WAGE_TYPES);

export const WORKSHOP_WAGE_TYPE_LABELS: Record<WorkshopWageType, string> = {
  fixed: "Fixed",
  per_session: "Per session",
  percentage: "Percentage",
};

/** Workshop payment ledger types (debit/credit) — same values as accounting transactions. */
export const WORKSHOP_PAYMENT_TYPES = TRANSACTION_TYPES;
export type WorkshopPaymentType = TransactionType;
export const WORKSHOP_PAYMENT_TYPE_VALUES = TRANSACTION_TYPE_VALUES;
export const WORKSHOP_PAYMENT_TYPE_LABELS = TRANSACTION_TYPE_LABELS;

/** Reuse accounting payment methods for workshop payments. */
export const WORKSHOP_PAYMENT_METHODS = PAYMENT_METHODS;
export type WorkshopPaymentMethod = PaymentMethod;
export const WORKSHOP_PAYMENT_METHOD_VALUES = PAYMENT_METHOD_VALUES;
export const WORKSHOP_PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
