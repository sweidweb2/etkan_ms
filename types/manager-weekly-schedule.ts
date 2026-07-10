import type { FieldErrors } from "@/types/auth";

export type WeeklyScheduleDay =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface ManagerWeeklyScheduleSession {
  id: string;
  class_id: string;
  className: string;
  subjectName: string;
  teacherName: string;
  room: string;
  day: WeeklyScheduleDay;
  startTime: string;
  endTime: string;
}

export interface ManagerWeeklyScheduleClassOption {
  id: string;
  label: string;
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
