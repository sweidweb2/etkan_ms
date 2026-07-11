import { getDefaultManagerClassWeights } from "@/lib/constants/manager-class-weights-mock";
import type { ManagerClassWeightsRow } from "@/types/manager-class-weights";

const STORAGE_KEY = "etkan_ms_preview_class_weights";

type StoredClassWeights = Record<string, ManagerClassWeightsRow>;

function isValidStoredWeights(
  value: unknown
): value is ManagerClassWeightsRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<ManagerClassWeightsRow>;
  return (
    typeof row.class_id === "string" &&
    typeof row.tasks_weight === "number" &&
    typeof row.final_exam_weight === "number"
  );
}

function normalizeStoredWeights(
  classId: string,
  value: unknown
): ManagerClassWeightsRow | null {
  if (isValidStoredWeights(value)) {
    return value;
  }

  return null;
}

function readStore(): StoredClassWeights {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: StoredClassWeights = {};

    for (const [classId, value] of Object.entries(parsed)) {
      const weights = normalizeStoredWeights(classId, value);
      if (weights) {
        normalized[classId] = weights;
      }
    }

    return normalized;
  } catch {
    return {};
  }
}

function writeStore(store: StoredClassWeights) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getPreviewClassWeightsFromStore(
  classId: string
): ManagerClassWeightsRow | null {
  const stored = readStore()[classId];
  if (stored) {
    return stored;
  }

  return null;
}

export function setPreviewClassWeights(weights: ManagerClassWeightsRow) {
  const store = readStore();
  store[weights.class_id] = weights;
  writeStore(store);
}

export function getPreviewClassWeightsFromStoreOrDefault(
  classId: string
): ManagerClassWeightsRow {
  return getPreviewClassWeightsFromStore(classId) ?? getDefaultManagerClassWeights(classId);
}
