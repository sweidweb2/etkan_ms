import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type {
  ManagerStudentClassTabDetail,
  ManagerStudentClassTaskRow,
} from "@/types/manager-student-class-detail";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";
import type { StudentTeamLeaderBundle } from "@/types/student-team-leader";

/** Student panel class detail payload (read-only, self-scoped). */
export type StudentClassDetailForSelf = {
  classRow: ManagerStudentClassRow;
  sessions: ManagerClassSessionRow[];
  detail: ManagerStudentClassTabDetail;
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
  uploads: StudentTaskUploadForSelf[];
  teamLeader: StudentTeamLeaderBundle | null;
};

/** Own task file shown in the student portal. Storage path stays on the server. */
export type StudentTaskUploadForSelf = {
  id: string;
  student_task_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

/** Student panel task detail: task fields, own grade, and own uploads. */
export type StudentClassTaskDetailForSelf = {
  classRow: ManagerStudentClassRow;
  task: {
    id: string;
    session_id: string | null;
    session_label: string | null;
    /** Students may only upload once the class task is started. */
    started: boolean;
    title: string;
    description: string | null;
    due_date: string | null;
    max_grade: number;
    is_yes_no: boolean;
  };
  studentTask: {
    id: string;
    status: StudentTaskStatusValue;
    grade: number | null;
    submitted_at: string | null;
    graded_at: string | null;
  } | null;
  uploads: StudentTaskUploadForSelf[];
};

export type StudentTaskUploadActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  upload?: StudentTaskUploadForSelf;
};

export type DeleteStudentTaskUploadActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  uploadId?: string;
};

export type { ManagerStudentClassTaskRow };
