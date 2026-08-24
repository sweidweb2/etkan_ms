import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";
import type { AttendeeStatusValue } from "@/lib/constants/manager-attendee-status";
import type { FieldErrors } from "@/types/auth";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

/** tasks table row scoped to a class session. */
export interface ManagerSessionTaskRow {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_grade: number | null;
  created_at: string;
}

/** attendee table row joined with student profile for session detail. */
export interface ManagerSessionAttendeeRow {
  id: string;
  session_id: string;
  student_id: string;
  full_name: string;
  email: string;
  note: string | null;
  /** Matches `attendee.status` (present|absent|late|excused). */
  status: AttendeeStatusValue;
  created_at: string;
}

export type SessionDetailsTabValue = "tasks" | "attendee";

/** student_tasks row joined with student profile for task detail. */
export interface ManagerStudentTaskRow {
  id: string;
  task_id: string;
  student_id: string;
  student_profile_id: string | null;
  full_name: string;
  status: StudentTaskStatusValue;
  submitted_at: string | null;
  grade: number | null;
  notes: string | null;
  graded_at: string | null;
}

export type UpdateClassSessionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerClassSessionRow;
};

export type DeleteClassSessionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  classId?: string;
};

export type UpdateSessionSettingsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerClassSessionRow;
  linkedPhase?: ManagerSessionPhaseLink | null;
};

export type CreateSessionTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  task?: ManagerSessionTaskRow;
};

export type UpdateSessionTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  task?: ManagerSessionTaskRow;
  gradesReset?: boolean;
};

export type UpdateAttendeeActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  attendee?: ManagerSessionAttendeeRow;
};

export type UpdateStudentTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  studentTask?: ManagerStudentTaskRow;
};
