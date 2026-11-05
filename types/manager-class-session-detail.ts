import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";
import type { AttendeeStatusValue } from "@/lib/constants/manager-attendee-status";
import type { FieldErrors } from "@/types/auth";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
/** class_tasks row for manager class/task surfaces. */
export interface ManagerClassTaskRow {
  id: string;
  class_id: string;
  source_subject_task_id: string | null;
  title: string;
  description: string | null;
  period: number;
  max_grade: number | null;
  sort_order: number;
  started: boolean;
  started_at: string | null;
  due_date: string | null;
  created_at: string;
}

/** @deprecated Use ManagerClassTaskRow — session-scoped tasks are gone. */
export type ManagerSessionTaskRow = ManagerClassTaskRow;

/** attendee table row joined with student profile for session detail. */
export interface ManagerSessionAttendeeRow {
  id: string;
  session_id: string;
  student_id: string;
  full_name: string;
  email: string;
  /** Matches `attendee.status` (present|absent|late|excused). */
  status: AttendeeStatusValue;
  created_at: string;
}

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
  student_report: string | null;
  graded_at: string | null;
}

/** student_task_uploads row for manager/teacher task detail (no storage_path). */
export interface ManagerStudentTaskUploadRow {
  id: string;
  student_task_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
}

export type UploadStudentTaskFileActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  upload?: ManagerStudentTaskUploadRow;
};

export type DeleteStudentTaskUploadActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  uploadId?: string;
};

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
};

export type CreateClassTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  task?: ManagerClassTaskRow;
};

export type UpdateClassTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  task?: ManagerClassTaskRow;
  gradesClamped?: boolean;
};

export type DeleteClassTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type SetClassTaskStartedActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  task?: ManagerClassTaskRow;
};

export type ImportSubjectTasksActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  tasks?: ManagerClassTaskRow[];
  importedCount?: number;
  skippedCount?: number;
};

/** @deprecated Use CreateClassTaskActionState. */
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
  gradesClamped?: boolean;
};

export type DeleteSessionTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
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
