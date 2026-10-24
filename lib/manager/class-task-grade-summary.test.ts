import { describe, expect, it } from "vitest";
import { computeClassTaskGradeSummary } from "@/lib/manager/class-task-grade-summary";

describe("computeClassTaskGradeSummary", () => {
  it("averages per-student totals against sum of task max grades", () => {
    const summary = computeClassTaskGradeSummary({
      tasks: [
        { id: "t1", max_grade: 100 },
        { id: "t2", max_grade: 100 },
      ],
      studentTasks: [
        { task_id: "t1", student_id: "a", grade: 90 },
        { task_id: "t2", student_id: "a", grade: 90 },
        { task_id: "t1", student_id: "b", grade: 80 },
        { task_id: "t2", student_id: "b", grade: 80 },
      ],
    });

    expect(summary.averageEarned).toBe(170);
    expect(summary.totalMax).toBe(200);
    expect(summary.progressPercent).toBe(85);
    expect(summary.studentCount).toBe(2);
    expect(summary.taskCount).toBe(2);
    expect(summary.gradedCellCount).toBe(4);
  });

  it("returns zeros when there are no tasks", () => {
    const summary = computeClassTaskGradeSummary({
      tasks: [],
      studentTasks: [],
    });

    expect(summary).toEqual({
      averageEarned: 0,
      totalMax: 0,
      progressPercent: 0,
      studentCount: 0,
      taskCount: 0,
      gradedCellCount: 0,
    });
  });
});
