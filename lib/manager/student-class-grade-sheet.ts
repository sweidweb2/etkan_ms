import { DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS } from "@/lib/constants/manager-class-grade-defaults";
import { getAttendanceDisplayKey } from "@/lib/constants/manager-student-attendance-display";
import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import { computeWeightedCourseTotalGrade } from "@/lib/manager/compute-student-course-grade";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

export type StudentClassGradeSheetTaskRow = {
  title: string;
  sessionLabel: string | null;
  grade: number | null;
  maxGrade: number;
  status: string;
};

export type StudentClassGradeSheetGroupSlot = {
  sessionLabel: string;
  gradeLabel: string;
};

export type StudentClassGradeSheetFactor = {
  grade: number | null;
  weight: number;
  contribution: number | null;
};

export type StudentClassGradeSheetModel = {
  studentName: string;
  course: {
    className: string;
    subjectName: string;
    semesterName: string;
    enrollmentStatus: string;
    joinedAt: string;
    computeType: string | null;
    totalGrade: number | null;
    isComputed: boolean;
  };
  attendance: {
    presentCount: number;
    totalSessions: number;
  };
  groupGradeSlots: StudentClassGradeSheetGroupSlot[];
  taskRows: StudentClassGradeSheetTaskRow[];
  mainFactors: {
    tasks: StudentClassGradeSheetFactor;
    finalExam: StudentClassGradeSheetFactor & { title: string | null };
    previewTotal: number | null;
  };
  generatedAt: string;
};

type BuildStudentClassGradeSheetModelInput = {
  student: ManagerClassStudentRow;
  classRow: ManagerClassRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  finalExam: ManagerClassFinalExamRow | null;
  generatedAt?: Date;
};

function computeContribution(
  grade: number | null,
  weight: number
): number | null {
  if (grade == null) {
    return null;
  }

  return Math.round(((grade * weight) / 100) * 10) / 10;
}

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

function buildGroupGradeSlots(
  detail: ManagerStudentClassTabDetail
): StudentClassGradeSheetGroupSlot[] {
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

function buildTaskRows(
  detail: ManagerStudentClassTabDetail
): StudentClassGradeSheetTaskRow[] {
  const sessionLabelById = new Map(
    detail.attendanceSlots.map((slot) => [slot.session_id, slot.session_label])
  );

  return detail.tasks.map((task) => ({
    title: task.title,
    sessionLabel:
      task.session_label ??
      (task.session_id
        ? (sessionLabelById.get(task.session_id) ?? task.session_id)
        : null),
    grade: task.grade,
    maxGrade: task.max_grade,
    status: task.status,
  }));
}

export function buildStudentClassGradeSheetModel({
  student,
  classRow,
  gradeRow,
  detail,
  finalExam,
  generatedAt = new Date(),
}: BuildStudentClassGradeSheetModelInput): StudentClassGradeSheetModel {
  const courseGrade = detail.courseGrade;
  const tasksWeight =
    courseGrade?.task_weight ?? DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.tasks_weight;
  const finalExamWeight =
    courseGrade?.final_exam_weight ??
    DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.final_exam_weight;
  const tasksGrade =
    courseGrade?.task_total_grade ?? gradeRow.task_total_grade ?? null;
  const finalExamGrade =
    courseGrade?.final_exam_grade ?? gradeRow.final_exam_grade ?? null;

  const previewTotal =
    gradeRow.total_grade ??
    computeWeightedCourseTotalGrade({
      taskTotalGrade: tasksGrade,
      finalExamGrade: finalExamGrade,
      tasksWeight,
      finalExamWeight,
    });

  return {
    studentName: student.full_name,
    course: {
      className: classRow.name,
      subjectName: classRow.subject_name,
      semesterName: classRow.semester_name ?? "—",
      enrollmentStatus: student.enrollment_status,
      joinedAt: student.joined_at,
      computeType: courseGrade?.type ?? null,
      totalGrade: previewTotal,
      isComputed: gradeRow.is_computed,
    },
    attendance: buildAttendanceSummary(detail),
    groupGradeSlots: buildGroupGradeSlots(detail),
    taskRows: buildTaskRows(detail),
    mainFactors: {
      tasks: {
        grade: tasksGrade,
        weight: tasksWeight,
        contribution: computeContribution(tasksGrade, tasksWeight),
      },
      finalExam: {
        title: finalExam?.title ?? null,
        grade: finalExamGrade,
        weight: finalExamWeight,
        contribution: computeContribution(finalExamGrade, finalExamWeight),
      },
      previewTotal,
    },
    generatedAt: generatedAt.toISOString(),
  };
}
