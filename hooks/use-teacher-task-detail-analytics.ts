"use client";

import { useLocalStorageBoolean } from "@/hooks/use-local-storage-boolean";
import {
  TEACHER_LAYOUT_DEFAULTS,
  TEACHER_LAYOUT_STORAGE_KEYS,
  TEACHER_LAYOUT_STORAGE_VALUES,
} from "@/lib/constants/teacher-layout-preferences";

/**
 * Teacher layout preference: show the analytics section on task details pages.
 */
export function useTeacherTaskDetailAnalytics() {
  return useLocalStorageBoolean(
    TEACHER_LAYOUT_STORAGE_KEYS.TASK_DETAIL_ANALYTICS,
    TEACHER_LAYOUT_DEFAULTS.taskDetailAnalytics,
    {
      onValue: TEACHER_LAYOUT_STORAGE_VALUES.ON,
      offValue: TEACHER_LAYOUT_STORAGE_VALUES.OFF,
    }
  );
}
