import { getManagerClassStudentsPreview } from "@/lib/manager/get-manager-class-students-preview";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10_000;
  }

  return hash;
}

function roundGrade(value: number) {
  return Math.round(value * 10) / 10;
}

export function getManagerClassStudentGradesPreview(
  classId: string
): ManagerClassStudentGradeRow[] {
  const students = getManagerClassStudentsPreview(classId);
  const readyStudents = students.filter((student) => {
    const seed = hashString(`${classId}:${student.student_profile_id}`);
    return seed % 5 !== 0;
  });

  return students.map((student) => {
    const seed = hashString(`${classId}:${student.student_profile_id}`);
    const taskTotalGrade = roundGrade(65 + ((seed * 5) % 31));
    const finalExamGrade = roundGrade(50 + ((seed * 7) % 46));
    const missingBucket = seed % 5;
    const taskGradeValue = missingBucket === 1 ? null : taskTotalGrade;
    const finalExamGradeValue = missingBucket === 3 ? null : finalExamGrade;
    const totalGrade = roundGrade(
      (finalExamGradeValue ?? 0) * 0.4 + (taskGradeValue ?? 0) * 0.6
    );

    return {
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      username: student.username,
      email: student.email,
      phone: student.phone,
      enrollment_status: student.enrollment_status,
      is_computed:
        missingBucket !== 0 &&
        missingBucket !== 1 &&
        missingBucket !== 2 &&
        missingBucket !== 3 &&
        readyStudents.findIndex(
          (readyStudent) =>
            readyStudent.student_profile_id === student.student_profile_id
        ) >= Math.ceil(readyStudents.length / 2),
      total_grade: totalGrade,
      task_total_grade: taskGradeValue,
      final_exam_grade: finalExamGradeValue,
    };
  });
}
