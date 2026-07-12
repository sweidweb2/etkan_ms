import type { ManagerClassWeightsRow } from "@/types/manager-class-weights";

export type FactorWeightsForm = {
  group_weight: string;
  final_exam_weight: string;
  tasks_weight: string;
  attendee_weight: string;
};

export type FactorWeightsValues = {
  group_weight: number;
  final_exam_weight: number;
  tasks_weight: number;
  attendee_weight: number;
};

export function buildFactorWeightsFormFromClassWeights(
  weights: ManagerClassWeightsRow
): FactorWeightsForm {
  return {
    group_weight: "0",
    final_exam_weight: String(weights.final_exam_weight),
    tasks_weight: String(weights.tasks_weight),
    attendee_weight: "0",
  };
}

export function parseWeight(value: string) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function roundWeight(value: number) {
  return Math.round(value * 10) / 10;
}

export function roundGrade(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildDefaultTaskWeights(tasks: Array<{ id: string }>) {
  if (tasks.length === 0) {
    return {};
  }

  const even = roundWeight(100 / tasks.length);
  const weights: Record<string, string> = {};

  tasks.forEach((task, index) => {
    if (index === tasks.length - 1) {
      const assigned = even * (tasks.length - 1);
      weights[task.id] = String(roundWeight(100 - assigned));
    } else {
      weights[task.id] = String(even);
    }
  });

  return weights;
}

export function validateFactorWeights(values: FactorWeightsForm) {
  const total =
    parseWeight(values.group_weight) +
    parseWeight(values.final_exam_weight) +
    parseWeight(values.tasks_weight) +
    parseWeight(values.attendee_weight);

  if (Math.abs(total - 100) > 0.001) {
    return "Factor weights must add up to 100%.";
  }

  return null;
}

export function validateTaskWeights(
  tasks: Array<{ id: string }>,
  taskWeights: Record<string, string>
) {
  if (tasks.length === 0) {
    return null;
  }

  const total = tasks.reduce(
    (sum, task) => sum + parseWeight(taskWeights[task.id] ?? "0"),
    0
  );

  if (Math.abs(total - 100) > 0.001) {
    return "Task weights must add up to 100%.";
  }

  return null;
}

export function toFactorWeightValues(values: FactorWeightsForm): FactorWeightsValues {
  return {
    group_weight: parseWeight(values.group_weight),
    final_exam_weight: parseWeight(values.final_exam_weight),
    tasks_weight: parseWeight(values.tasks_weight),
    attendee_weight: parseWeight(values.attendee_weight),
  };
}

export function getComputeFactorWeightFormDefaults(input: {
  stored_tasks_weight?: number | null;
  stored_final_exam_weight?: number | null;
  default_tasks_weight: number;
  default_final_exam_weight: number;
}): Pick<FactorWeightsForm, "tasks_weight" | "final_exam_weight"> {
  return {
    tasks_weight: String(
      input.stored_tasks_weight ?? input.default_tasks_weight
    ),
    final_exam_weight: String(
      input.stored_final_exam_weight ?? input.default_final_exam_weight
    ),
  };
}
