export interface ManagerClassGradeSummary {
  classId: string;
  className: string;
  averageGrade: number;
  studentCount: number;
}

export interface ManagerClassStudentGrade {
  studentId: string;
  studentName: string;
  finalGrade: number;
}
