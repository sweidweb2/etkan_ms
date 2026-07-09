import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";

const DEFAULT_DUMMY_SESSION_COUNT = 8;

/** Preview dummy series keyed by class id. */
const CLASS_ANALYTICS_DUMMY: Record<
  string,
  { taskGrades: number[]; attendanceRates: number[] }
> = {
  "cls-math-adv": {
    taskGrades: [78, 81, 79, 85, 83, 87, 88, 86, 90, 89],
    attendanceRates: [92, 90, 94, 88, 91, 89, 93, 90, 95, 92],
  },
  "cls-eng-lit": {
    taskGrades: [65, 68, 70, 72, 74, 71, 75, 77, 76, 80],
    attendanceRates: [82, 80, 85, 83, 86, 84, 88, 81, 87, 85],
  },
  "cls-phys-1": {
    taskGrades: [70, 73, 75, 72, 78, 80, 77, 82, 84, 81],
    attendanceRates: [86, 88, 84, 90, 87, 89, 91, 85, 88, 92],
  },
  "cls-chem-org": {
    taskGrades: [62, 66, 64, 69, 71, 68, 73, 75, 72, 78],
    attendanceRates: [78, 81, 79, 83, 80, 85, 82, 86, 84, 88],
  },
  "cls-bio-cell": {
    taskGrades: [74, 76, 78, 75, 80, 82, 79, 85, 83, 86],
    attendanceRates: [90, 87, 91, 89, 93, 88, 92, 90, 94, 91],
  },
  "cls-cs-py": {
    taskGrades: [80, 82, 85, 83, 88, 86, 90, 89, 92, 91],
    attendanceRates: [94, 91, 95, 92, 96, 93, 97, 94, 95, 98],
  },
  "cls-art-studio": {
    taskGrades: [88, 85, 90, 87, 91, 89, 93, 92, 94, 90],
    attendanceRates: [96, 93, 97, 95, 98, 94, 96, 97, 95, 99],
  },
};

const FALLBACK_TASK_GRADES = [72, 74, 71, 78, 76, 80, 82, 79, 81, 77];
const FALLBACK_ATTENDANCE_RATES = [88, 85, 90, 87, 92, 86, 89, 91, 88, 93];

function hashClassId(classId: string) {
  let hash = 0;

  for (const character of classId) {
    hash = (hash + character.charCodeAt(0)) % 997;
  }

  return hash;
}

function buildFallbackSeries(classId: string, sessionCount: number) {
  const offset = hashClassId(classId) % 5;

  const taskGrades = Array.from({ length: sessionCount }, (_, index) => {
    const base = FALLBACK_TASK_GRADES[(index + offset) % FALLBACK_TASK_GRADES.length]!;
    return Math.min(95, base + (index % 3));
  });

  const attendanceRates = Array.from({ length: sessionCount }, (_, index) => {
    const base =
      FALLBACK_ATTENDANCE_RATES[
        (index + offset) % FALLBACK_ATTENDANCE_RATES.length
      ]!;
    return Math.min(99, base + (index % 2));
  });

  return { taskGrades, attendanceRates };
}

function resolveSessionCount(classId: string) {
  const classRow = getManagerClassPreview(classId);
  const fromProgress = classRow.completed_sessions;
  const fromSubject = classRow.subject_nb_sessions;

  return Math.max(
    DEFAULT_DUMMY_SESSION_COUNT,
    fromProgress > 0 ? fromProgress : 0,
    fromSubject > 0 ? Math.min(fromSubject, 10) : 0
  );
}

export function getManagerClassAnalyticsPreview(
  classId: string,
  enrollmentCount?: number
): ManagerClassAnalyticsPreview {
  const classRow = getManagerClassPreview(classId);
  const enrolledCount = Math.max(
    enrollmentCount ?? classRow.enrollment_count,
    12
  );
  const sessionCount = resolveSessionCount(classId);

  const dummySeries =
    CLASS_ANALYTICS_DUMMY[classId] ?? buildFallbackSeries(classId, sessionCount);

  const taskGrades = dummySeries.taskGrades.slice(0, sessionCount);
  const attendanceRates = dummySeries.attendanceRates.slice(0, sessionCount);

  const taskGradeTrend = Array.from({ length: sessionCount }, (_, index) => {
    const sessionNumber = sessionCount - index;
    const averageGrade = taskGrades[sessionNumber - 1] ?? taskGrades[0] ?? 0;

    return {
      session_label: `S${sessionNumber}`,
      nb_order: sessionNumber,
      average_grade: averageGrade,
      task_count: 1 + ((sessionNumber - 1) % 3),
    };
  });

  const attendanceTrend = Array.from({ length: sessionCount }, (_, index) => {
    const sessionNumber = sessionCount - index;
    const attendanceRate =
      attendanceRates[sessionNumber - 1] ?? attendanceRates[0] ?? 0;
    const presentCount = Math.round((attendanceRate / 100) * enrolledCount);

    return {
      session_label: `S${sessionNumber}`,
      nb_order: sessionNumber,
      attendance_rate: attendanceRate,
      present_count: presentCount,
      enrolled_count: enrolledCount,
    };
  });

  const overallAverageTaskGrade = Math.round(
    taskGradeTrend.reduce((sum, point) => sum + point.average_grade, 0) /
      taskGradeTrend.length
  );

  const overallAttendanceRate = Math.round(
    attendanceTrend.reduce((sum, point) => sum + point.attendance_rate, 0) /
      attendanceTrend.length
  );

  return {
    taskGradeTrend,
    attendanceTrend,
    overallAverageTaskGrade,
    overallAttendanceRate,
  };
}
