import { describe, expect, it } from "vitest";
import {
  buildGradesByTaskId,
  computeOverallAverageTaskGrade,
  computeSessionTaskGradeSummary,
} from "@/lib/manager/class-analytics";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";

describe("computeSessionTaskGradeSummary", () => {
  it("averages each task in a session before combining session grades", () => {
    const gradesByTaskId = buildGradesByTaskId([
      {
        task_id: "task-a",
        grade: 8,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
      {
        task_id: "task-a",
        grade: 6,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
      {
        task_id: "task-b",
        grade: 50,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
      {
        task_id: "task-b",
        grade: 70,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
    ]);

    const summary = computeSessionTaskGradeSummary(
      [
        { id: "task-a", max_grade: 10 },
        { id: "task-b", max_grade: 100 },
      ],
      gradesByTaskId
    );

    expect(summary).toEqual({
      average_grade: 65,
      task_count: 2,
      graded_count: 4,
    });
  });

  it("includes graded rows from every task even when one task has fewer grades", () => {
    const gradesByTaskId = buildGradesByTaskId([
      {
        task_id: "task-a",
        grade: 90,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
      {
        task_id: "task-a",
        grade: 70,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
      {
        task_id: "task-b",
        grade: 60,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
    ]);

    const summary = computeSessionTaskGradeSummary(
      [
        { id: "task-a", max_grade: 100 },
        { id: "task-b", max_grade: 100 },
      ],
      gradesByTaskId
    );

    expect(summary.average_grade).toBe(70);
    expect(summary.task_count).toBe(2);
    expect(summary.graded_count).toBe(3);
  });
});

describe("computeOverallAverageTaskGrade", () => {
  it("ignores sessions that have tasks but no graded rows yet", () => {
    const overall = computeOverallAverageTaskGrade([
      { average_grade: 80, task_count: 2, graded_count: 10 },
      { average_grade: 0, task_count: 2, graded_count: 0 },
    ]);

    expect(overall).toBe(80);
  });
});
