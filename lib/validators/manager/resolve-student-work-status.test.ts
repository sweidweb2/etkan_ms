import { describe, expect, it } from "vitest";
import { resolveStudentWorkStatusOnSave } from "@/lib/validators/manager/resolve-student-work-status";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";

describe("resolveStudentWorkStatusOnSave", () => {
  it("promotes pending to graded when a grade is provided", () => {
    expect(
      resolveStudentWorkStatusOnSave({
        status: STUDENT_TASK_STATUSES.PENDING,
        grade: 18,
      })
    ).toBe(STUDENT_TASK_STATUSES.GRADED);
  });

  it("promotes missing to late when a grade is provided", () => {
    expect(
      resolveStudentWorkStatusOnSave({
        status: STUDENT_TASK_STATUSES.MISSING,
        grade: 12,
      })
    ).toBe(STUDENT_TASK_STATUSES.LATE);
  });

  it("demotes graded to pending when grade is cleared", () => {
    expect(
      resolveStudentWorkStatusOnSave({
        status: STUDENT_TASK_STATUSES.GRADED,
        grade: "",
      })
    ).toBe(STUDENT_TASK_STATUSES.PENDING);
  });

  it("marks overdue pending work as missing when no grade is provided", () => {
    expect(
      resolveStudentWorkStatusOnSave({
        status: STUDENT_TASK_STATUSES.PENDING,
        grade: "",
        dueDate: "2020-01-01T00:00:00.000Z",
      })
    ).toBe(STUDENT_TASK_STATUSES.MISSING);
  });
});
