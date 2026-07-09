import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";

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
  /** Preview-only toggle until backend supports activation rules. */
  is_active: boolean;
  created_at: string;
}

export type SessionDetailsTabValue = "tasks" | "attendee";

/** student_tasks row joined with student profile for task detail. */
export interface ManagerStudentTaskRow {
  id: string;
  task_id: string;
  student_id: string;
  full_name: string;
  status: StudentTaskStatusValue;
  submitted_at: string | null;
  grade: number | null;
  notes: string | null;
  graded_at: string | null;
}
