import type {
  ManagerStudentCourseGrade,
  ManagerStudentCourseGradeComponent,
  ManagerStudentCourseGradeComponentKey,
} from "@/types/manager-student-course-grade";
import {
  averageAttendeeGradeFromJson,
  averageGroupGradeFromJson,
} from "@/types/manager-student-course-grade";

export const MANAGER_STUDENT_COURSE_GRADE_COMPONENT_LABELS: Record<
  ManagerStudentCourseGradeComponentKey,
  string
> = {
  tasks: "Total tasks",
  final_exam: "Final exams",
};

/** Display order for course-grade weight rules (matches official two-factor compute). */
export const MANAGER_STUDENT_COURSE_GRADE_WEIGHT_RULE_ORDER: ManagerStudentCourseGradeComponentKey[] =
  ["tasks", "final_exam"];

export const MANAGER_STUDENT_COURSE_GRADE_COMPONENT_COLORS: Record<
  ManagerStudentCourseGradeComponentKey,
  string
> = {
  tasks: "#8b5cf6",
  final_exam: "#f59e0b",
};

export const MANAGER_STUDENT_COURSE_GRADE_COMPONENT_ACCENT: Record<
  ManagerStudentCourseGradeComponentKey,
  string
> = {
  tasks: "border-l-violet-500",
  final_exam: "border-l-amber-500",
};

export const MANAGER_STUDENT_COURSE_GRADE_TYPE_LABELS: Record<string, string> = {
  semester_1: "Semester 1",
  semester_2: "Semester 2",
  midterm: "Midterm",
  final: "Final",
  custom: "Custom",
};

export function formatCourseGradeValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toFixed(1);
}

export function formatCourseGradeWeight(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(0)}%`;
}

function computeWeightedPoints(
  grade: number | null,
  weight: number | null
): number | null {
  if (grade == null || weight == null) {
    return null;
  }

  return (grade * weight) / 100;
}

export function getManagerStudentCourseGradeComponents(
  courseGrade: ManagerStudentCourseGrade
): ManagerStudentCourseGradeComponent[] {
  const rows: Array<{
    key: ManagerStudentCourseGradeComponentKey;
    grade: number | null;
    weight: number | null;
  }> = [
    {
      key: "tasks",
      grade: courseGrade.task_total_grade,
      weight: courseGrade.task_weight,
    },
    {
      key: "final_exam",
      grade: courseGrade.final_exam_grade,
      weight: courseGrade.final_exam_weight,
    },
  ];

  return rows.map((row) => ({
    key: row.key,
    label: MANAGER_STUDENT_COURSE_GRADE_COMPONENT_LABELS[row.key],
    grade: row.grade,
    weight: row.weight,
    weightedPoints: computeWeightedPoints(row.grade, row.weight),
    color: MANAGER_STUDENT_COURSE_GRADE_COMPONENT_COLORS[row.key],
  }));
}

export function getManagerStudentCourseGradeWeightRules(
  courseGrade: ManagerStudentCourseGrade
): ManagerStudentCourseGradeComponent[] {
  const componentsByKey = Object.fromEntries(
    getManagerStudentCourseGradeComponents(courseGrade).map((component) => [
      component.key,
      component,
    ])
  ) as Record<
    ManagerStudentCourseGradeComponentKey,
    ManagerStudentCourseGradeComponent
  >;

  return MANAGER_STUDENT_COURSE_GRADE_WEIGHT_RULE_ORDER.map(
    (key) => componentsByKey[key]
  );
}

export function computeManagerStudentCourseGradeWeightTotal(
  courseGrade: ManagerStudentCourseGrade
): number {
  return getManagerStudentCourseGradeWeightRules(courseGrade).reduce(
    (sum, rule) => sum + (rule.weight ?? 0),
    0
  );
}

export function computeManagerStudentCourseFinalGrade(
  courseGrade: ManagerStudentCourseGrade
): number | null {
  const components = getManagerStudentCourseGradeComponents(courseGrade);
  const scored = components.filter(
    (component) => component.weightedPoints != null
  );

  if (scored.length === 0) {
    return null;
  }

  const total = scored.reduce(
    (sum, component) => sum + (component.weightedPoints ?? 0),
    0
  );

  return Math.round(total * 100) / 100;
}

export function getManagerStudentCourseGradeTypeLabel(type: string | null): string {
  if (!type) {
    return "Unspecified";
  }

  return MANAGER_STUDENT_COURSE_GRADE_TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

export function getManagerStudentCourseGradePreviewField(
  courseGrade: ManagerStudentCourseGrade | null,
  key: "total_group_grade" | "attendee_grade"
): number | null {
  if (!courseGrade) {
    return null;
  }

  if (key === "total_group_grade") {
    return averageGroupGradeFromJson(courseGrade.group_grades_json);
  }

  return averageAttendeeGradeFromJson(courseGrade.attendee_grades_json);
}
