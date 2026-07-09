import { getPreviewClassWeightsFromStore } from "@/lib/preview/manager-class-weights-store";
import type { ManagerClassWeightsRow } from "@/types/manager-class-weights";

const DEFAULT_WEIGHT = 25;

export function getDefaultManagerClassWeights(
  classId: string
): ManagerClassWeightsRow {
  return {
    class_id: classId,
    group_weight: DEFAULT_WEIGHT,
    final_exam_weight: DEFAULT_WEIGHT,
    tasks_weight: DEFAULT_WEIGHT,
    attendee_weight: DEFAULT_WEIGHT,
  };
}

export function getManagerClassWeightsPreview(
  classId: string
): ManagerClassWeightsRow {
  return getPreviewClassWeightsFromStore(classId) ?? getDefaultManagerClassWeights(classId);
}
