import { MANAGER_CLASS_STUDENT_GRADES_MOCK } from "@/lib/constants/manager-subject-student-grades-data";
import type {
  ManagerClassGradeSummary,
  ManagerClassStudentGrade,
} from "@/types/manager-subject-grade";
import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";

export type {
  ManagerClassGradeSummary,
  ManagerClassStudentGrade,
} from "@/types/manager-subject-grade";

export function getManagerClassStudentGrades(
  classRow: ManagerSubjectClassRow
): ManagerClassStudentGrade[] {
  return MANAGER_CLASS_STUDENT_GRADES_MOCK[classRow.id] ?? [];
}

export function getClassAverageFromStudentGrades(
  grades: ManagerClassStudentGrade[]
): number {
  if (grades.length === 0) {
    return 0;
  }

  const total = grades.reduce((sum, grade) => sum + grade.finalGrade, 0);
  return Math.round((total / grades.length) * 10) / 10;
}

export function getManagerClassGradeSummaries(
  classes: ManagerSubjectClassRow[]
): ManagerClassGradeSummary[] {
  return classes.map((classRow) => {
    const studentGrades = getManagerClassStudentGrades(classRow);

    return {
      classId: classRow.id,
      className: classRow.name,
      averageGrade: getClassAverageFromStudentGrades(studentGrades),
      studentCount: studentGrades.length,
    };
  });
}

export function getSubjectAverageGrade(
  summaries: ManagerClassGradeSummary[]
): number {
  const totalStudents = summaries.reduce(
    (sum, summary) => sum + summary.studentCount,
    0
  );

  if (totalStudents === 0) {
    return 0;
  }

  const weightedTotal = summaries.reduce(
    (sum, summary) => sum + summary.averageGrade * summary.studentCount,
    0
  );

  return Math.round((weightedTotal / totalStudents) * 10) / 10;
}
