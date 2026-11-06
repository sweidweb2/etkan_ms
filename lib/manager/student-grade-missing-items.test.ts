import { describe, expect, it } from "vitest";
import {
  buildStudentGradeMissingItems,
  hasStudentGradeMissingItems,
} from "@/lib/manager/student-grade-missing-items";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";

describe("buildStudentGradeMissingItems", () => {
  it("adds a missing item when tasks_weight > 0 and the class has no tasks", () => {
    const items = buildStudentGradeMissingItems({
      classTasks: [],
      studentTasks: [],
      finalExam: {
        id: "exam-1",
        title: "Final",
        max_grade: 100,
        due_date: null,
      },
      finalExamGrade: {
        id: "grade-1",
        final_exam_id: "exam-1",
        student_id: "student-1",
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: null,
        grade: 90,
        notes: null,
        graded_at: "2026-07-12T00:00:00.000Z",
        created_at: "2026-07-12T00:00:00.000Z",
      },
      factorWeights: {
        tasks_weight: 60,
        final_exam_weight: 40,
      },
    });

    expect(hasStudentGradeMissingItems(items)).toBe(true);
    expect(items).toEqual([
      expect.objectContaining({
        kind: "task",
        reason: "missing_record",
        label: "Tasks — No tasks in class",
      }),
    ]);
  });

  it("does not require tasks when tasks_weight is 0", () => {
    const items = buildStudentGradeMissingItems({
      classTasks: [],
      studentTasks: [],
      finalExam: {
        id: "exam-1",
        title: "Final",
        max_grade: 100,
        due_date: null,
      },
      finalExamGrade: {
        id: "grade-1",
        final_exam_id: "exam-1",
        student_id: "student-1",
        status: STUDENT_TASK_STATUSES.GRADED,
        submitted_at: null,
        grade: 90,
        notes: null,
        graded_at: "2026-07-12T00:00:00.000Z",
        created_at: "2026-07-12T00:00:00.000Z",
      },
      factorWeights: {
        tasks_weight: 0,
        final_exam_weight: 100,
      },
    });

    expect(items).toEqual([]);
  });

  it("does not treat missing tasks or final exam as blockers", () => {
    const items = buildStudentGradeMissingItems({
      classTasks: [
        {
          id: "task-1",
          session_id: "session-1",
          session_label: "S1",
          session_nb_order: 1,
          title: "Worksheet",
          max_grade: 100,
          is_yes_no: false,
          due_date: "2026-07-01T00:00:00.000Z",
          created_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      studentTasks: [
        {
          id: "st-1",
          task_id: "task-1",
          student_id: "student-1",
          status: STUDENT_TASK_STATUSES.MISSING,
          submitted_at: null,
          grade: null,
          notes: null,
          graded_at: null,
        },
      ],
      finalExam: {
        id: "exam-1",
        title: "Final",
        max_grade: 100,
        due_date: null,
      },
      finalExamGrade: {
        id: "grade-1",
        final_exam_id: "exam-1",
        student_id: "student-1",
        status: STUDENT_TASK_STATUSES.MISSING,
        submitted_at: null,
        grade: null,
        notes: null,
        graded_at: null,
        created_at: "2026-07-12T00:00:00.000Z",
      },
      factorWeights: {
        tasks_weight: 60,
        final_exam_weight: 40,
      },
    });

    expect(items).toEqual([]);
  });
});
