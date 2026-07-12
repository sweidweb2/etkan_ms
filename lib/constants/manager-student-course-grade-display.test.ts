import { describe, expect, it } from "vitest";
import {
  computeManagerStudentCourseFinalGrade,
  computeManagerStudentCourseGradeWeightTotal,
  getManagerStudentCourseGradeComponents,
  getManagerStudentCourseGradeWeightRules,
} from "@/lib/constants/manager-student-course-grade-display";
import type { ManagerStudentCourseGrade } from "@/types/manager-student-course-grade";

function buildCourseGrade(
  overrides: Partial<ManagerStudentCourseGrade> = {}
): ManagerStudentCourseGrade {
  return {
    id: "grade-1",
    task_json_grade_weights: [],
    group_grades_json: [
      { session_id: "s1", grade: 90 },
      { session_id: "s2", grade: 80 },
    ],
    attendee_grades_json: [
      { session_id: "s1", grade: 100, status: "present" },
      { session_id: "s2", grade: 0, status: "absent" },
    ],
    task_weight: 60,
    task_total_grade: 80,
    final_exam_grade: 90,
    final_exam_weight: 40,
    type: "final",
    created_at: "2026-07-12T12:00:00.000Z",
    ...overrides,
  };
}

describe("manager student course grade display (two-factor)", () => {
  it("returns only tasks and final exam components", () => {
    const components = getManagerStudentCourseGradeComponents(buildCourseGrade());

    expect(components.map((component) => component.key)).toEqual([
      "tasks",
      "final_exam",
    ]);
    expect(components).toHaveLength(2);
  });

  it("orders weight rules as tasks then final exam", () => {
    const rules = getManagerStudentCourseGradeWeightRules(buildCourseGrade());

    expect(rules.map((rule) => rule.key)).toEqual(["tasks", "final_exam"]);
    expect(rules[0]?.weight).toBe(60);
    expect(rules[1]?.weight).toBe(40);
  });

  it("sums only tasks and final exam weights", () => {
    expect(
      computeManagerStudentCourseGradeWeightTotal(buildCourseGrade())
    ).toBe(100);
  });

  it("computes final score from two-factor weights and ignores group/attendee JSON", () => {
    const finalGrade = computeManagerStudentCourseFinalGrade(buildCourseGrade());

    // 80 * 0.6 + 90 * 0.4 = 84
    expect(finalGrade).toBe(84);
  });

  it("ignores empty group/attendee JSON when computing final score", () => {
    const finalGrade = computeManagerStudentCourseFinalGrade(
      buildCourseGrade({
        group_grades_json: [],
        attendee_grades_json: [],
      })
    );

    expect(finalGrade).toBe(84);
  });
});
