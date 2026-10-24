"use client";

import { useLocalStorageBoolean } from "@/hooks/use-local-storage-boolean";
import {
  TEACHER_LAYOUT_DEFAULTS,
  TEACHER_LAYOUT_STORAGE_KEYS,
  TEACHER_LAYOUT_STORAGE_VALUES,
} from "@/lib/constants/teacher-layout-preferences";

/**
 * Teacher layout preference: show task analytics cards on class Tasks tabs.
 */
export function useTeacherTaskAnalytics() {
  return useLocalStorageBoolean(
    TEACHER_LAYOUT_STORAGE_KEYS.TASK_ANALYTICS,
    TEACHER_LAYOUT_DEFAULTS.taskAnalytics,
    {
      onValue: TEACHER_LAYOUT_STORAGE_VALUES.ON,
      offValue: TEACHER_LAYOUT_STORAGE_VALUES.OFF,
    }
  );
}
