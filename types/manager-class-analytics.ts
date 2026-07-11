import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";

export interface ManagerClassSessionTaskGradePoint {
  session_label: string;
  nb_order: number;
  average_grade: number;
  task_count: number;
  graded_count: number;
}

export interface ManagerClassSessionGroupGradePoint {
  session_label: string;
  nb_order: number;
  group_grade_level: SessionGroupGradeLevelValue;
  group_grade_label: string;
  group_grade_index: number;
}

export interface ManagerClassSessionAttendancePoint {
  session_label: string;
  nb_order: number;
  attendance_rate: number;
  present_count: number;
  enrolled_count: number;
}

export interface ManagerClassAnalyticsPreview {
  taskGradeTrend: ManagerClassSessionTaskGradePoint[];
  groupGradeTrend: ManagerClassSessionGroupGradePoint[];
  attendanceTrend: ManagerClassSessionAttendancePoint[];
  overallAverageTaskGrade: number;
  overallAttendanceRate: number;
}
