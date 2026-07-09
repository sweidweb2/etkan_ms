import type { ManagerClassWeightsRow } from "@/types/manager-class-weights";

const STORAGE_KEY = "etkan_ms_preview_class_weights";

type StoredClassWeights = Record<string, ManagerClassWeightsRow>;

function readStore(): StoredClassWeights {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as StoredClassWeights;
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
  return readStore()[classId] ?? null;
}

export function setPreviewClassWeights(weights: ManagerClassWeightsRow) {
  const store = readStore();
  store[weights.class_id] = weights;
  writeStore(store);
}
