import { describe, expect, it } from "vitest";
import { DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS } from "@/lib/constants/manager-class-grade-defaults";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import {
  computeFastCertificateEffectiveFactors,
  computeWeightedAvailableTaskTotalGrade,
  getGradedTasksFromDetail,
  resolveFastCertificateAvailability,
  resolveFastCertificateFactorDefaults,
} from "@/lib/manager/fast-certificate-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerStudentClassTaskRow } from "@/types/manager-student-class-detail";

const classTasks: ManagerClassTaskForGradesRow[] = [
  {
    id: "task-1",
    session_id: "session-1",
    session_label: "S1",
    session_nb_order: 1,
    title: "Worksheet 1",
    max_grade: 20,
    due_date: null,
    created_at: null,
  },
  {
    id: "task-2",
    session_id: "session-2",
    session_label: "S2",
    session_nb_order: 2,
    title: "Project",
    max_grade: 100,
    due_date: null,
    created_at: null,
  },
];

const detailTasks: ManagerStudentClassTaskRow[] = [
  {
    student_task_id: "st-1",
    task_id: "task-1",
    session_id: "session-1",
    title: "Worksheet 1",
    due_date: null,
    max_grade: 20,
    status: STUDENT_TASK_STATUSES.GRADED,
    grade: 18,
    submitted_at: null,
    graded_at: null,
  },
  {
    student_task_id: "st-2",
    task_id: "task-2",
    session_id: "session-2",
    title: "Project",
    due_date: null,
    max_grade: 100,
    status: STUDENT_TASK_STATUSES.PENDING,
    grade: null,
    submitted_at: null,
    graded_at: null,
  },
];

describe("fast certificate grade", () => {
  it("returns only graded tasks from detail", () => {
    const graded = getGradedTasksFromDetail(detailTasks, classTasks);

    expect(graded).toHaveLength(1);
    expect(graded[0]?.taskId).toBe("task-1");
    expect(graded[0]?.sessionLabel).toBe("S1");
  });

  it("forces 100/0 factor defaults when the class has no final exam", () => {
    const availability = resolveFastCertificateAvailability({
      detailTasks,
      classTasks,
      finalExam: null,
      finalExamGrade: null,
      finalExamMaxGrade: null,
    });

    expect(resolveFastCertificateFactorDefaults(
      availability,
      DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.tasks_weight,
      DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.final_exam_weight
    )).toEqual({ tasksWeight: 100, finalExamWeight: 0 });
  });

  it("excludes ungraded final exam and uses task-only weights", () => {
    const availability = resolveFastCertificateAvailability({
      detailTasks,
      classTasks,
      finalExam: {
        id: "exam-1",
        class_id: "class-1",
        title: "Final",
        max_grade: 100,
        due_date: null,
        created_at: null,
      },
      finalExamGrade: null,
      finalExamMaxGrade: 100,
    });

    expect(availability.hasGradedFinalExam).toBe(false);
    expect(resolveFastCertificateFactorDefaults(
      availability,
      60,
      40
    )).toEqual({ tasksWeight: 100, finalExamWeight: 0 });
  });

  it("uses exam-only defaults when no graded tasks exist", () => {
    const availability = resolveFastCertificateAvailability({
      detailTasks: [],
      classTasks,
      finalExam: {
        id: "exam-1",
        class_id: "class-1",
        title: "Final",
        max_grade: 100,
        due_date: null,
        created_at: null,
      },
      finalExamGrade: 80,
      finalExamMaxGrade: 100,
    });

    expect(resolveFastCertificateFactorDefaults(availability, 60, 40)).toEqual({
      tasksWeight: 0,
      finalExamWeight: 100,
    });
  });

  it("computes weighted task total from graded tasks only", () => {
    const graded = getGradedTasksFromDetail(detailTasks, classTasks);

    expect(
      computeWeightedAvailableTaskTotalGrade(graded, { "task-1": "100" })
    ).toBe(90);
  });

  it("weights tasks differently from a simple mean", () => {
    const bothGraded: ManagerStudentClassTaskRow[] = [
      {
        ...detailTasks[0]!,
        grade: 18,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
      {
        ...detailTasks[1]!,
        grade: 85,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
    ];
    const graded = getGradedTasksFromDetail(bothGraded, classTasks);

    expect(
      computeWeightedAvailableTaskTotalGrade(graded, {
        "task-1": "75",
        "task-2": "25",
      })
    ).toBe(88.8);
  });

  it("computes mixed task and exam totals with renormalized effective weights", () => {
    const bothGraded: ManagerStudentClassTaskRow[] = [
      detailTasks[0]!,
      {
        ...detailTasks[1]!,
        grade: 85,
        status: STUDENT_TASK_STATUSES.GRADED,
      },
    ];
    const availability = resolveFastCertificateAvailability({
      detailTasks: bothGraded,
      classTasks,
      finalExam: {
        id: "exam-1",
        class_id: "class-1",
        title: "Final",
        max_grade: 100,
        due_date: null,
        created_at: null,
      },
      finalExamGrade: 80,
      finalExamMaxGrade: 100,
    });

    const result = computeFastCertificateEffectiveFactors({
      availability,
      factorWeights: { tasksWeight: 60, finalExamWeight: 40 },
      taskWeights: { "task-1": "50", "task-2": "50" },
    });

    expect(result.tasksGrade).toBe(87.5);
    expect(result.finalExamGrade).toBe(80);
    expect(result.tasksWeight).toBe(60);
    expect(result.finalExamWeight).toBe(40);
    expect(result.previewTotal).toBe(84.5);
  });

  it("returns null preview when no graded inputs are available", () => {
    const availability = resolveFastCertificateAvailability({
      detailTasks: detailTasks.map((task) => ({
        ...task,
        grade: null,
        status: STUDENT_TASK_STATUSES.PENDING,
      })),
      classTasks,
      finalExam: null,
      finalExamGrade: null,
      finalExamMaxGrade: null,
    });

    const result = computeFastCertificateEffectiveFactors({
      availability,
      factorWeights: { tasksWeight: 100, finalExamWeight: 0 },
      taskWeights: {},
    });

    expect(availability.canCompute).toBe(false);
    expect(result.previewTotal).toBeNull();
  });
});
