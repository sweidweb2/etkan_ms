import {
  parseWeight,
  roundGrade,
} from "@/lib/compute/custom-compute-form-utils";
import {
  isStudentTaskGraded,
  normalizeStoredFinalExamGrade,
  computeWeightedNormalizedTaskTotal,
} from "@/lib/manager/compute-student-course-grade";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerStudentClassTaskRow } from "@/types/manager-student-class-detail";

export type FastCertificateGradedTask = {
  taskId: string;
  title: string;
  sessionLabel: string | null;
  grade: number;
  maxGrade: number;
  status: string;
};

export type FastCertificateFactorWeights = {
  tasksWeight: number;
  finalExamWeight: number;
};

export type FastCertificateAvailability = {
  gradedTasks: FastCertificateGradedTask[];
  hasFinalExamRecord: boolean;
  finalExamGrade: number | null;
  hasGradedTasks: boolean;
  hasGradedFinalExam: boolean;
  canCompute: boolean;
};

export type FastCertificateEffectiveFactors = {
  tasksWeight: number;
  finalExamWeight: number;
  tasksGrade: number | null;
  finalExamGrade: number | null;
  previewTotal: number | null;
  tasksContribution: number | null;
  finalExamContribution: number | null;
};

function normalizeTaskGradePercent(grade: number, maxGrade: number | null) {
  const cap = maxGrade != null && Number(maxGrade) > 0 ? Number(maxGrade) : 100;
  return (grade / cap) * 100;
}

function computeContribution(
  grade: number | null,
  weight: number
): number | null {
  if (grade == null) {
    return null;
  }

  return Math.round(((grade * weight) / 100) * 10) / 10;
}

export function getGradedTasksFromDetail(
  detailTasks: ManagerStudentClassTaskRow[],
  classTasks: ManagerClassTaskForGradesRow[]
): FastCertificateGradedTask[] {
  const sessionLabelByTaskId = new Map(
    classTasks.map((task) => [task.id, task.session_label])
  );

  return detailTasks
    .filter((task) => isStudentTaskGraded(task.grade, task.status))
    .map((task) => ({
      taskId: task.task_id,
      title: task.title,
      sessionLabel: task.session_id
        ? (sessionLabelByTaskId.get(task.task_id) ?? task.session_id)
        : null,
      grade: task.grade!,
      maxGrade: task.max_grade,
      status: task.status,
    }));
}

export function resolveFastCertificateAvailability(input: {
  detailTasks: ManagerStudentClassTaskRow[];
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
  finalExamGrade: number | null;
  finalExamMaxGrade: number | null;
}): FastCertificateAvailability {
  const gradedTasks = getGradedTasksFromDetail(
    input.detailTasks,
    input.classTasks
  );
  const hasFinalExamRecord = input.finalExam != null;
  const finalExamGrade = hasFinalExamRecord
    ? normalizeStoredFinalExamGrade(
        input.finalExamGrade,
        input.finalExamMaxGrade
      )
    : null;
  const hasGradedTasks = gradedTasks.length > 0;
  const hasGradedFinalExam = finalExamGrade != null;

  return {
    gradedTasks,
    hasFinalExamRecord,
    finalExamGrade,
    hasGradedTasks,
    hasGradedFinalExam,
    canCompute: hasGradedTasks || hasGradedFinalExam,
  };
}

export function resolveFastCertificateFactorDefaults(
  availability: FastCertificateAvailability,
  defaultTasksWeight: number,
  defaultFinalExamWeight: number
): FastCertificateFactorWeights {
  if (!availability.hasFinalExamRecord) {
    return { tasksWeight: 100, finalExamWeight: 0 };
  }

  if (!availability.hasGradedFinalExam && availability.hasGradedTasks) {
    return { tasksWeight: 100, finalExamWeight: 0 };
  }

  if (availability.hasGradedFinalExam && !availability.hasGradedTasks) {
    return { tasksWeight: 0, finalExamWeight: 100 };
  }

  return {
    tasksWeight: defaultTasksWeight,
    finalExamWeight: defaultFinalExamWeight,
  };
}

export function areFastCertificateFactorWeightsEditable(
  availability: FastCertificateAvailability
): { tasks: boolean; finalExam: boolean } {
  if (!availability.hasFinalExamRecord) {
    return { tasks: false, finalExam: false };
  }

  if (!availability.hasGradedFinalExam) {
    return { tasks: false, finalExam: false };
  }

  if (!availability.hasGradedTasks) {
    return { tasks: false, finalExam: false };
  }

  return { tasks: true, finalExam: true };
}

export function computeWeightedAvailableTaskTotalGrade(
  gradedTasks: FastCertificateGradedTask[],
  taskWeights: Record<string, string>
): number | null {
  if (gradedTasks.length === 0) {
    return null;
  }

  return computeWeightedNormalizedTaskTotal(
    gradedTasks.map((task) => ({
      normalizedPercent: normalizeTaskGradePercent(task.grade, task.maxGrade),
      weightPercent: parseWeight(taskWeights[task.taskId] ?? "0"),
    }))
  );
}

export function computeFastCertificatePartialTotal(input: {
  tasksGrade: number | null;
  finalExamGrade: number | null;
  tasksWeight: number;
  finalExamWeight: number;
  hasGradedTasks: boolean;
  hasGradedFinalExam: boolean;
}): number | null {
  const parts: Array<{ grade: number; weight: number }> = [];

  if (input.hasGradedTasks && input.tasksGrade != null && input.tasksWeight > 0) {
    parts.push({ grade: input.tasksGrade, weight: input.tasksWeight });
  }

  if (
    input.hasGradedFinalExam &&
    input.finalExamGrade != null &&
    input.finalExamWeight > 0
  ) {
    parts.push({ grade: input.finalExamGrade, weight: input.finalExamWeight });
  }

  if (parts.length === 0) {
    return null;
  }

  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  return roundGrade(
    parts.reduce(
      (sum, part) => sum + part.grade * (part.weight / totalWeight),
      0
    )
  );
}

export function computeFastCertificateEffectiveFactors(input: {
  availability: FastCertificateAvailability;
  factorWeights: FastCertificateFactorWeights;
  taskWeights: Record<string, string>;
}): FastCertificateEffectiveFactors {
  const { availability, factorWeights } = input;
  const tasksGrade = computeWeightedAvailableTaskTotalGrade(
    availability.gradedTasks,
    input.taskWeights
  );

  let effectiveTasksWeight = 0;
  let effectiveFinalExamWeight = 0;

  if (availability.hasGradedTasks && tasksGrade != null) {
    effectiveTasksWeight = factorWeights.tasksWeight;
  }

  if (availability.hasGradedFinalExam && availability.finalExamGrade != null) {
    effectiveFinalExamWeight = factorWeights.finalExamWeight;
  }

  const availableWeightTotal = effectiveTasksWeight + effectiveFinalExamWeight;

  if (availableWeightTotal > 0) {
    effectiveTasksWeight = roundGrade(
      (effectiveTasksWeight / availableWeightTotal) * 100
    );
    effectiveFinalExamWeight = roundGrade(
      (effectiveFinalExamWeight / availableWeightTotal) * 100
    );
  }

  const previewTotal = computeFastCertificatePartialTotal({
    tasksGrade,
    finalExamGrade: availability.finalExamGrade,
    tasksWeight: effectiveTasksWeight,
    finalExamWeight: effectiveFinalExamWeight,
    hasGradedTasks: availability.hasGradedTasks,
    hasGradedFinalExam: availability.hasGradedFinalExam,
  });

  return {
    tasksWeight: effectiveTasksWeight,
    finalExamWeight: effectiveFinalExamWeight,
    tasksGrade,
    finalExamGrade: availability.finalExamGrade,
    previewTotal,
    tasksContribution: computeContribution(tasksGrade, effectiveTasksWeight),
    finalExamContribution: computeContribution(
      availability.finalExamGrade,
      effectiveFinalExamWeight
    ),
  };
}
