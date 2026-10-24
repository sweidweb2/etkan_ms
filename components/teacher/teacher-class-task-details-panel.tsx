"use client";

import { ClassTaskDetailsPanel } from "@/components/manager/classes/class-task-details-panel";
import { useTeacherTaskDetailAnalytics } from "@/hooks/use-teacher-task-detail-analytics";
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

  return (
    <ClassTaskDetailsPanel
      {...props}
      studentTasksLayout="workspace"
      showTaskAnalyticsSection={hasHydrated && enabled}
    />
  );
}
