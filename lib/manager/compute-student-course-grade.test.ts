import { describe, expect, it } from "vitest";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { computeStudentTaskTotalGrade } from "@/lib/manager/compute-student-course-grade";

describe("computeStudentTaskTotalGrade", () => {
  it("returns null when the class has no tasks", () => {
    expect(
      computeStudentTaskTotalGrade([], [
        {
          task_id: "task-1",
          grade: 10,
          status: STUDENT_TASK_STATUSES.GRADED,
        },
      ])
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
        ]
      )
    ).toBeNull();
  });

  it("averages normalized per-task grades for this student in the class", () => {
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
        ]
      )
    ).toBe(87.5);
  });
});
