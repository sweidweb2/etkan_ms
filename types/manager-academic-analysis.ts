import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";

export type ManagerAcademicAnalysisStudentRow = {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  status: StudentStatusValue;
};

export type ManagerAcademicAnalysisClassSessionPoint = {
  classId: string;
  className: string;
  status: ClassStatusValue;
  actualSessions: number;
  plannedSessions: number;
};

export type ManagerAcademicAnalysisData = {
  classCount: number;
  studentCounts: {
    active: number;
    inactive: number;
    total: number;
  };
  students: ManagerAcademicAnalysisStudentRow[];
  classSessionSeries: ManagerAcademicAnalysisClassSessionPoint[];
};
