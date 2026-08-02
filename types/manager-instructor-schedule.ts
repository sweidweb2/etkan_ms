import type { FieldErrors } from "@/types/auth";

export type InstructorScheduleSlotType = "free" | "busy";

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

export interface ManagerInstructorScheduleSession {
  id: string;
  recordId: string;
  name: string;
  type: InstructorScheduleSlotType;
  /** ISO date YYYY-MM-DD */
  slotDate: string;
  startTime: string;
  endTime: string;
  /** #RRGGBB hex */
  color: string;
}

export type ManagerInstructorSchedulesPageData = {
  instructors: ManagerInstructorScheduleTab[];
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

export type CopyInstructorScheduleSlotPreviewItem = {
  recordId: string;
  name: string;
  type: InstructorScheduleSlotType;
  slotDate: string;
  startTime: string;
  endTime: string;
  color: string;
  sourceSlotDate: string;
};

export type CopyInstructorScheduleSlotSkipItem =
  CopyInstructorScheduleSlotPreviewItem & {
    reason: string;
  };

export type CopyInstructorSchedulePreview = {
  recordId: string;
  weekStart: string;
  weekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
  willCreate: CopyInstructorScheduleSlotPreviewItem[];
  willSkip: CopyInstructorScheduleSlotSkipItem[];
};

export type CopyInstructorScheduleSlotActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  createdCount?: number;
  skippedCount?: number;
};
