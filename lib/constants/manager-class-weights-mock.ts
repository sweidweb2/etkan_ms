import { getPreviewClassWeightsFromStore } from "@/lib/preview/manager-class-weights-store";
import type { ManagerClassWeightsRow } from "@/types/manager-class-weights";

const DEFAULT_TASKS_WEIGHT = 60;
const DEFAULT_FINAL_EXAM_WEIGHT = 40;

export function getDefaultManagerClassWeights(
  classId: string
): ManagerClassWeightsRow {
  return {
    class_id: classId,
    tasks_weight: DEFAULT_TASKS_WEIGHT,
    final_exam_weight: DEFAULT_FINAL_EXAM_WEIGHT,
  };
}

export function getManagerClassWeightsPreview(
  classId: string
): ManagerClassWeightsRow {
  return getPreviewClassWeightsFromStore(classId) ?? getDefaultManagerClassWeights(classId);
}
