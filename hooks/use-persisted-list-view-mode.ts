"use client";

import { useState } from "react";
import { useHasMounted } from "@/hooks/use-has-mounted";
import {
  MANAGER_LIST_VIEW_MODES,
  readManagerListViewMode,
  writeManagerListViewMode,
  type ManagerListViewMode,
  type ManagerListViewModeStorageKey,
} from "@/lib/constants/manager-list-view-mode";

/**
 * Table/grid layout for a manager list, restored from localStorage after mount
 * (SSR and hydration always render the table).
 */
export function usePersistedListViewMode(key: ManagerListViewModeStorageKey) {
  const hasMounted = useHasMounted();
  const [viewMode, setViewMode] = useState<ManagerListViewMode>(
    MANAGER_LIST_VIEW_MODES.TABLE
  );
  const [hasRestored, setHasRestored] = useState(false);

  if (hasMounted && !hasRestored) {
    setHasRestored(true);
    setViewMode(readManagerListViewMode(key) ?? MANAGER_LIST_VIEW_MODES.TABLE);
  }

  const changeViewMode = (mode: ManagerListViewMode) => {
    setViewMode(mode);
    writeManagerListViewMode(key, mode);
  };

  return [viewMode, changeViewMode] as const;
}
