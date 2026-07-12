import type { FieldErrors } from "@/types/auth";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";

export interface ManagerSemesterRow {
  id: string;
  name: string;
  nb_courses: number;
  amount: number;
  created_at: string;
}

export interface ManagerSemesterProgressRow {
  semester: ManagerSemesterRow;
  classes: ManagerSemesterClassRow[];
}

export type CreateSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  semester?: ManagerSemesterRow;
};

export type AddStudentToSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  enrollment?: ManagerStudentSemesterRow;
};

export type ConnectSemesterClassActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  classRow?: ManagerSemesterClassRow;
  semester?: ManagerSemesterRow;
};
