import type { FieldErrors } from "@/types/auth";

export type WeeklyScheduleSlotType =
  | "class"
  | "workshop"
  | "online"
  | "meeting";

export type WeeklyScheduleSlotColor =
  | "#BAE6FD"
  | "#A7F3D0"
  | "#DDD6FE"
  | "#FDE68A"
  | "#FECDD3";

export interface ManagerWeeklyScheduleSession {
  id: string;
  name: string;
  type: WeeklyScheduleSlotType;
  /** ISO date YYYY-MM-DD */
  slotDate: string;
  startTime: string;
  endTime: string;
  /** #RRGGBB hex */
  color: string;
}

export type CreateWeeklyScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerWeeklyScheduleSession;
};

export type UpdateWeeklyScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerWeeklyScheduleSession;
};

export type DeleteWeeklyScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type CopyWeeklyScheduleSlotPreviewItem = {
  name: string;
  type: WeeklyScheduleSlotType;
  slotDate: string;
  startTime: string;
  endTime: string;
  color: string;
  sourceSlotDate: string;
};

export type CopyWeeklyScheduleSlotSkipItem = CopyWeeklyScheduleSlotPreviewItem & {
  reason: string;
};

export type CopyWeeklySchedulePreview = {
  weekStart: string;
  weekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
  willCreate: CopyWeeklyScheduleSlotPreviewItem[];
  willSkip: CopyWeeklyScheduleSlotSkipItem[];
};

export type CopyWeeklyScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  createdCount?: number;
  skippedCount?: number;
};
