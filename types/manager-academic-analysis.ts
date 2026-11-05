import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

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
  classSessionSeries: ManagerAcademicAnalysisClassSessionPoint[];
};
