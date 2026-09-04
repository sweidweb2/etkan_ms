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

/** Other enrolled students in a class (names only). */
export type StudentClassmateRow = {
  full_name: string;
  username: string | null;
};

/** Student panel class detail payload (read-only, self-scoped). */
export type StudentClassDetailForSelf = {
  classRow: ManagerStudentClassRow;
  sessions: ManagerClassSessionRow[];
  detail: ManagerStudentClassTabDetail;
  classmates: StudentClassmateRow[];
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
};

/** Student panel task detail: task fields + own grade only. */
export type StudentClassTaskDetailForSelf = {
  classRow: ManagerStudentClassRow;
  task: {
    id: string;
    session_id: string | null;
    session_label: string | null;
    title: string;
    description: string | null;
    due_date: string | null;
    max_grade: number;
  };
  studentTask: {
    status: StudentTaskStatusValue;
    grade: number | null;
    submitted_at: string | null;
    graded_at: string | null;
  } | null;
};

export type { ManagerStudentClassTaskRow };
