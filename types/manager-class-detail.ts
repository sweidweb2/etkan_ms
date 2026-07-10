import type { FieldErrors } from "@/types/auth";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { ManagerSubjectRow } from "@/types/manager-subject";

export type ManagerClassSubjectOption = Pick<
  ManagerSubjectRow,
  "id" | "name" | "nb_sessions"
>;

export type ManagerClassSemesterOption = Pick<ManagerSemesterRow, "id" | "name">;

export type ManagerClassTeacherSelectOption = {
  id: string;
  username: string | null;
};

export type ManagerClassTeacherOption = ManagerClassTeacherSelectOption & {
  assigned: boolean;
  assignment_id: string | null;
};

export type CreateClassActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  classRow?: ManagerClassRow;
};

export type UpdateClassActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  classRow?: ManagerClassRow;
};

export type UpdateClassStatusActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  classRow?: ManagerClassRow;
};

export type CreateClassSessionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  session?: ManagerClassSessionRow;
  classRow?: ManagerClassRow;
};

export type CreateFinalExamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  finalExam?: ManagerClassFinalExamRow;
  studentGrades?: ManagerStudentFinalExamGradeRow[];
};

export type UpdateFinalExamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  finalExam?: ManagerClassFinalExamRow;
};

export type UpdateStudentFinalExamGradeActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  studentGrade?: ManagerStudentFinalExamGradeRow;
};

export type AddStudentToClassActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student?: ManagerClassStudentRow;
  studentGrade?: ManagerStudentFinalExamGradeRow;
  classRow?: ManagerClassRow;
};

export type AssignClassTeacherActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  teacher?: ManagerClassTeacherOption;
  classRow?: ManagerClassRow;
};

export type UnassignClassTeacherActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  teacherId?: string;
  classRow?: ManagerClassRow;
};

export type { ManagerClassAnalyticsPreview };
