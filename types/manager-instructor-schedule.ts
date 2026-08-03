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
  username: string | null;
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
}

export type ManagerInstructorSchedulesPageData = {
  instructors: ManagerInstructorScheduleTab[];
  workshops: ManagerScheduleWorkshopTab[];
  sessions: ManagerInstructorScheduleSession[];
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
