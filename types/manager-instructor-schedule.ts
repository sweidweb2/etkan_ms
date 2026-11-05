import type { FieldErrors } from "@/types/auth";
import type { WorkshopStatusValue } from "@/lib/constants/manager-workshop-status";

export type InstructorScheduleSlotType = "free" | "busy";

export type ScheduleEntityType = "instructor" | "workshop";

/** Preset pastel swatches (custom hex colors are also allowed). */
export type InstructorScheduleSlotPresetColor =
  | "#BAE6FD"
  | "#A7F3D0"
  | "#DDD6FE"
  | "#FDE68A"
  | "#FECDD3";

export type ManagerInstructorScheduleTab = {
  id: string;
  full_name: string;
};

export type ManagerScheduleWorkshopTab = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: WorkshopStatusValue;
  /** Eligible for creating new slots (status + end_date rules). */
  eligible_for_create: boolean;
};

export interface ManagerInstructorScheduleSession {
  id: string;
  entityType: ScheduleEntityType;
  recordId: string;
  name: string;
  type: InstructorScheduleSlotType;
  /** ISO date YYYY-MM-DD — created/anchor date (informative). */
  slotDate: string;
  /** Recurring weekday: 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  /** #RRGGBB hex */
  color: string;
  /** Set when this instructor slot was mirrored from a workshop. */
  sourceWorkshopId: string | null;
  /** Workshop schedule slot this mirror was copied from. */
  sourceSlotId: string | null;
}

export type ManagerInstructorScheduleInitialBrowse = {
  kind: "instructor" | "all";
  recordId: string | null;
};

export type ManagerInstructorSchedulesPageData = {
  instructors: ManagerInstructorScheduleTab[];
  workshops: ManagerScheduleWorkshopTab[];
  sessions: ManagerInstructorScheduleSession[];
  initialBrowse: ManagerInstructorScheduleInitialBrowse;
};

/** Scope for deferred calendar session loads (filter changes). */
export type InstructorScheduleCalendarScope =
  | { kind: "all" }
  | { kind: "instructor"; recordId?: string }
  | { kind: "workshop"; recordId?: string };

export type ManagerInstructorScheduleSlotStats = {
  total: number;
  free: number;
  busy: number;
  instructorSlots: number;
  workshopSlots: number;
};

export type ManagerInstructorScheduleSlotsDetailsData = {
  instructors: ManagerInstructorScheduleTab[];
  workshops: ManagerScheduleWorkshopTab[];
  sessions: ManagerInstructorScheduleSession[];
  stats: ManagerInstructorScheduleSlotStats;
  totalCount: number;
  page: number;
  pageSize: number;
};

export type CreateInstructorScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerInstructorScheduleSession;
};

export type UpdateInstructorScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerInstructorScheduleSession;
};

export type DeleteInstructorScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};
