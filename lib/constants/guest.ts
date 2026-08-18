import {
  REGISTRATION_EDUCATION_LEVEL_LABELS,
  REGISTRATION_EDUCATION_LEVEL_VALUES,
  REGISTRATION_EDUCATION_LEVELS,
  type RegistrationEducationLevel,
} from "@/lib/constants/public-registration";

/** Reuse registration education levels for guest intake. */
export {
  REGISTRATION_EDUCATION_LEVELS as GUEST_EDUCATION_LEVELS,
  REGISTRATION_EDUCATION_LEVEL_VALUES as GUEST_EDUCATION_LEVEL_VALUES,
  REGISTRATION_EDUCATION_LEVEL_LABELS as GUEST_EDUCATION_LEVEL_LABELS,
};
export type GuestEducationLevel = RegistrationEducationLevel;

/** Pipeline nodes shown on the status schema (recorded in guest_status_events). */
export const GUEST_PIPELINE_STATUSES = {
  STARTED: "started",
  FINISHED_MEETING: "finished_meeting",
  FINISHED_PARENT_MEETING: "finished_parent_meeting",
  CHOSE_PLAN: "chose_plan",
  ROUTED_CORRECTLY: "routed_correctly",
  FINISHING_ROUTING_DOC: "finishing_routing_doc",
  FINISHED: "finished",
} as const;

export type GuestPipelineStatus =
  (typeof GUEST_PIPELINE_STATUSES)[keyof typeof GUEST_PIPELINE_STATUSES];

export const GUEST_PIPELINE_STATUS_VALUES = [
  GUEST_PIPELINE_STATUSES.STARTED,
  GUEST_PIPELINE_STATUSES.FINISHED_MEETING,
  GUEST_PIPELINE_STATUSES.FINISHED_PARENT_MEETING,
  GUEST_PIPELINE_STATUSES.CHOSE_PLAN,
  GUEST_PIPELINE_STATUSES.ROUTED_CORRECTLY,
  GUEST_PIPELINE_STATUSES.FINISHING_ROUTING_DOC,
  GUEST_PIPELINE_STATUSES.FINISHED,
] as const;

/** All values allowed on guest_status_events.status */
export const GUEST_STATUSES = GUEST_PIPELINE_STATUSES;

export type GuestStatus = GuestPipelineStatus;

export const GUEST_STATUS_VALUES = GUEST_PIPELINE_STATUS_VALUES;

/**
 * Independent guests.status profile pointer.
 * Pipeline log can be recorded only while pending. Removing a recorded step
 * is allowed while pending or finished (finished then reopens to pending).
 * Cancelled, rejected, and scheduled keep the schema locked.
 */
export const GUEST_CURRENT_STATUSES = {
  SCHEDULED: "scheduled",
  PENDING: "pending",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
  FINISHED: "finished",
} as const;

export type GuestCurrentStatus =
  (typeof GUEST_CURRENT_STATUSES)[keyof typeof GUEST_CURRENT_STATUSES];

export const GUEST_CURRENT_STATUS_VALUES = [
  GUEST_CURRENT_STATUSES.SCHEDULED,
  GUEST_CURRENT_STATUSES.PENDING,
  GUEST_CURRENT_STATUSES.CANCELLED,
  GUEST_CURRENT_STATUSES.REJECTED,
  GUEST_CURRENT_STATUSES.FINISHED,
] as const;

export const GUEST_DEFAULT_STATUS = GUEST_CURRENT_STATUSES.SCHEDULED;

export const GUEST_STATUS_LABELS: Record<GuestStatus, string> = {
  started: "Started",
  finished_meeting: "Finished meeting",
  finished_parent_meeting: "Finished parent meeting",
  chose_plan: "Chose plan",
  routed_correctly: "Routed correctly",
  finishing_routing_doc: "Finishing routing doc",
  finished: "Finished",
};

export const GUEST_CURRENT_STATUS_LABELS: Record<GuestCurrentStatus, string> = {
  scheduled: "Scheduled",
  pending: "Pending",
  cancelled: "Cancelled",
  rejected: "Rejected",
  finished: "Finished",
};

export const GUEST_CURRENT_STATUS_BADGE_CLASSES: Record<
  GuestCurrentStatus,
  string
> = {
  scheduled:
    "bg-violet-500/15 text-violet-700 ring-violet-500/25 dark:text-violet-400",
  pending: "bg-sky-500/15 text-sky-700 ring-sky-500/25 dark:text-sky-400",
  cancelled:
    "bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-400",
  rejected: "bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-400",
  finished:
    "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400",
};

export const GUEST_INTERESTED_SERVICES = {
  ETKAN_ROADMAP: "etkan_roadmap",
  PRIVATE: "private",
  WORKSHOPS: "workshops",
} as const;

export type GuestInterestedService =
  (typeof GUEST_INTERESTED_SERVICES)[keyof typeof GUEST_INTERESTED_SERVICES];

export const GUEST_INTERESTED_SERVICE_VALUES = [
  GUEST_INTERESTED_SERVICES.ETKAN_ROADMAP,
  GUEST_INTERESTED_SERVICES.PRIVATE,
  GUEST_INTERESTED_SERVICES.WORKSHOPS,
] as const;

export const GUEST_INTERESTED_SERVICE_LABELS: Record<
  GuestInterestedService,
  string
> = {
  etkan_roadmap: "Etkan roadmap",
  private: "Private",
  workshops: "Workshops",
};

export function isGuestCurrentStatus(value: string): value is GuestCurrentStatus {
  return (GUEST_CURRENT_STATUS_VALUES as readonly string[]).includes(value);
}

export function isGuestStatus(value: string): value is GuestStatus {
  return (GUEST_STATUS_VALUES as readonly string[]).includes(value);
}

export function canMutateGuestPipeline(status: GuestCurrentStatus): boolean {
  return status === GUEST_CURRENT_STATUSES.PENDING;
}

export function canRemoveGuestPipelineStatus(
  status: GuestCurrentStatus
): boolean {
  return (
    status === GUEST_CURRENT_STATUSES.PENDING ||
    status === GUEST_CURRENT_STATUSES.FINISHED
  );
}

/** Pipeline steps recorded when creating a student from a guest registration. */
export const GUEST_CREATE_STUDENT_PIPELINE_STATUSES = [
  GUEST_PIPELINE_STATUSES.ROUTED_CORRECTLY,
  GUEST_PIPELINE_STATUSES.FINISHING_ROUTING_DOC,
  GUEST_PIPELINE_STATUSES.FINISHED,
] as const;
