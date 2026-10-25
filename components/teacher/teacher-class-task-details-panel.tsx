"use client";

import { useEffect } from "react";
import { ClassTaskDetailsPanel } from "@/components/manager/classes/class-task-details-panel";
import { useTeacherTaskDetailAnalytics } from "@/hooks/use-teacher-task-detail-analytics";
import {
  TEACHER_CLASS_DETAIL_TABS,
  writeTeacherClassDetailTab,
} from "@/lib/constants/teacher-class-detail-tabs";
import type { ComponentProps } from "react";

type TeacherClassTaskDetailsPanelProps = Omit<
  ComponentProps<typeof ClassTaskDetailsPanel>,
  "showTaskAnalyticsSection" | "studentTasksLayout"
> & {
  navigation: NonNullable<
    ComponentProps<typeof ClassTaskDetailsPanel>["navigation"]
  >;
};

/**
 * Teacher task details: shared shell + workspace layout + analytics preference.
 */
export function TeacherClassTaskDetailsPanel(
  props: TeacherClassTaskDetailsPanelProps
) {
  const { enabled, hasHydrated } = useTeacherTaskDetailAnalytics();

  // So "back to class" restores the Tasks tab without `?tab=` RSC navigation.
  useEffect(() => {
    writeTeacherClassDetailTab(
      props.classRow.id,
      TEACHER_CLASS_DETAIL_TABS.TASKS
    );
  }, [props.classRow.id]);

  return (
    <ClassTaskDetailsPanel
      {...props}
      studentTasksLayout="workspace"
      showTaskAnalyticsSection={hasHydrated && enabled}
    />
  );
}
