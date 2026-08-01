import {
  computeFastCertificateEffectiveFactors,
  resolveFastCertificateAvailability,
  type FastCertificateEffectiveFactors,
  type FastCertificateFactorWeights,
} from "@/lib/manager/fast-certificate-grade";
import { getAttendanceDisplayKey } from "@/lib/constants/manager-student-attendance-display";
import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import type { StudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

type BuildFastCertificateSheetModelInput = {
  student: ManagerClassStudentRow;
  classRow: ManagerClassRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
  finalExamGrade: number | null;
  factorWeights: FastCertificateFactorWeights;
  taskWeights: Record<string, string>;
  generatedAt?: Date;
};

function buildAttendanceSummary(detail: ManagerStudentClassTabDetail) {
  const courseGrade = detail.courseGrade;

  if (courseGrade?.attendee_grades_json.length) {
    const totalSessions = courseGrade.attendee_grades_json.length;
    const presentCount = courseGrade.attendee_grades_json.filter(
      (entry) => entry.status?.toLowerCase() === "present"
    ).length;

    return { presentCount, totalSessions };
  }

  const totalSessions = detail.attendanceSlots.length;
  const presentCount = detail.attendanceSlots.filter(
    (slot) =>
      getAttendanceDisplayKey(slot.status) ===
      String(STUDENT_ATTENDANCE_STATUSES.PRESENT)
  ).length;

  return { presentCount, totalSessions };
}

function buildGroupGradeSlots(detail: ManagerStudentClassTabDetail) {
  const courseGrade = detail.courseGrade;

  if (courseGrade?.group_grades_json.length) {
    return courseGrade.group_grades_json.map((entry) => ({
      sessionLabel: entry.session_label ?? entry.session_id,
      gradeLabel: entry.grade.toFixed(1),
    }));
  }

  return detail.groupGradeSlots.map((slot) => ({
    sessionLabel: slot.session_label,
    gradeLabel: slot.group_grade_label,
  }));
}

export function buildFastCertificateSheetModel({
  student,
  classRow,
  detail,
  classTasks,
  finalExam,
  finalExamGrade,
  factorWeights,
  taskWeights,
  generatedAt = new Date(),
}: BuildFastCertificateSheetModelInput): StudentClassGradeSheetModel {
  const availability = resolveFastCertificateAvailability({
    detailTasks: detail.tasks,
    classTasks,
    finalExam,
    finalExamGrade,
    finalExamMaxGrade: finalExam?.max_grade ?? null,
  });

  const effective = computeFastCertificateEffectiveFactors({
    availability,
    factorWeights,
    taskWeights,
  });

  return buildFastCertificateSheetModelFromEffective({
    student,
    classRow,
    detail,
    finalExam,
    effective,
    gradedTasks: availability.gradedTasks,
    generatedAt,
  });
}

export function buildFastCertificateSheetModelFromEffective({
  student,
  classRow,
  detail,
  finalExam,
  effective,
  gradedTasks,
  generatedAt = new Date(),
}: {
  student: ManagerClassStudentRow;
  classRow: ManagerClassRow;
  detail: ManagerStudentClassTabDetail;
  finalExam: ManagerClassFinalExamRow | null;
  effective: FastCertificateEffectiveFactors;
  gradedTasks: ReturnType<
    typeof resolveFastCertificateAvailability
  >["gradedTasks"];
  generatedAt?: Date;
}): StudentClassGradeSheetModel {
  return {
    studentName: student.full_name,
    course: {
      className: classRow.name,
      subjectName: classRow.subject_name,
      semesterName: classRow.semester_name ?? "—",
      enrollmentStatus: "Member",
      joinedAt: student.joined_at,
      computeType: null,
      totalGrade: effective.previewTotal,
      isComputed: false,
    },
    attendance: buildAttendanceSummary(detail),
    groupGradeSlots: buildGroupGradeSlots(detail),
    taskRows: gradedTasks.map((task) => ({
      title: task.title,
      sessionLabel: task.sessionLabel,
      grade: task.grade,
      maxGrade: task.maxGrade,
      status: task.status,
    })),
    mainFactors: {
      tasks: {
        grade: effective.tasksGrade,
        weight: effective.tasksWeight,
        contribution: effective.tasksContribution,
      },
      finalExam: {
        title: finalExam?.title ?? null,
        grade: effective.finalExamGrade,
        weight: effective.finalExamWeight,
        contribution: effective.finalExamContribution,
      },
      previewTotal: effective.previewTotal,
    },
    generatedAt: generatedAt.toISOString(),
  };
}
