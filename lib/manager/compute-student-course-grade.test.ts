import { describe, expect, it } from "vitest";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  computeStudentTaskTotalGrade,
  computeWeightedNormalizedTaskTotal,
} from "@/lib/manager/compute-student-course-grade";

describe("computeWeightedNormalizedTaskTotal", () => {
  it("returns null when no positive weights", () => {
    expect(
      computeWeightedNormalizedTaskTotal([
        { normalizedPercent: 90, weightPercent: 0 },
        { normalizedPercent: 80, weightPercent: 0 },
      ])
    ).toBeNull();
  });

  it("sums only positive-weight entries", () => {
    expect(
      computeWeightedNormalizedTaskTotal([
        { normalizedPercent: 100, weightPercent: 20 },
        { normalizedPercent: 40, weightPercent: 80 },
        { normalizedPercent: 50, weightPercent: 0 },
      ])
    ).toBe(52);
  });
});

describe("computeStudentTaskTotalGrade", () => {
  it("returns null when the class has no tasks", () => {
    expect(
      computeStudentTaskTotalGrade(
        [],
        [
          {
            task_id: "task-1",
            grade: 10,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
        ],
        {}
      )
    ).toBeNull();
  });

  it("returns null when any class task is missing a graded student row", () => {
    expect(
      computeStudentTaskTotalGrade(
        [
          { id: "task-1", max_grade: 20 },
          { id: "task-2", max_grade: 100 },
        ],
        [
          {
            task_id: "task-1",
            grade: 18,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
        ],
        { "task-1": "50", "task-2": "50" }
      )
    ).toBeNull();
  });

  it("matches the old equal average when weights are even", () => {
    expect(
      computeStudentTaskTotalGrade(
        [
          { id: "task-1", max_grade: 20 },
          { id: "task-2", max_grade: 100 },
        ],
        [
          {
            task_id: "task-1",
            grade: 18,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
          {
            task_id: "task-2",
            grade: 85,
            status: STUDENT_TASK_STATUSES.LATE,
          },
        ],
        { "task-1": "50", "task-2": "50" }
      )
    ).toBe(87.5);
  });

  it("applies unequal per-task weights instead of a simple mean", () => {
    // Normalized: task-1 = 100, task-2 = 40. Mean would be 70.
    // Weighted 20/80: 100*0.2 + 40*0.8 = 52.
    expect(
      computeStudentTaskTotalGrade(
        [
          { id: "task-1", max_grade: 100 },
          { id: "task-2", max_grade: 100 },
        ],
        [
          {
            task_id: "task-1",
            grade: 100,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
          {
            task_id: "task-2",
            grade: 40,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
        ],
        { "task-1": "20", "task-2": "80" }
      )
    ).toBe(52);
  });

  it("returns null when all task weights are zero", () => {
    expect(
      computeStudentTaskTotalGrade(
        [
          { id: "task-1", max_grade: 100 },
          { id: "task-2", max_grade: 100 },
        ],
        [
          {
            task_id: "task-1",
            grade: 90,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
          {
            task_id: "task-2",
            grade: 40,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
        ],
        { "task-1": "0", "task-2": "0" }
      )
    ).toBeNull();
  });

  it("treats missing with null grade as scored 0", () => {
    expect(
      computeStudentTaskTotalGrade(
        [
          { id: "task-1", max_grade: 100 },
          { id: "task-2", max_grade: 100 },
        ],
        [
          {
            task_id: "task-1",
            grade: 100,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
          {
            task_id: "task-2",
            grade: null,
            status: STUDENT_TASK_STATUSES.MISSING,
          },
        ],
        { "task-1": "50", "task-2": "50" }
      )
    ).toBe(50);
  });

  it("weights graded and missing together", () => {
    // task-1 = 100 @ 20%, task-2 missing → 0 @ 80% → 20
    expect(
      computeStudentTaskTotalGrade(
        [
          { id: "task-1", max_grade: 100 },
          { id: "task-2", max_grade: 100 },
        ],
        [
          {
            task_id: "task-1",
            grade: 100,
            status: STUDENT_TASK_STATUSES.GRADED,
          },
          {
            task_id: "task-2",
            grade: 0,
            status: STUDENT_TASK_STATUSES.MISSING,
          },
        ],
        { "task-1": "20", "task-2": "80" }
      )
    ).toBe(20);
  });
});
