export interface ManagerClassSessionTaskGradePoint {
  session_label: string;
  nb_order: number;
  average_grade: number;
  task_count: number;
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
  attendanceTrend: ManagerClassSessionAttendancePoint[];
  overallAverageTaskGrade: number;
  overallAttendanceRate: number;
}
