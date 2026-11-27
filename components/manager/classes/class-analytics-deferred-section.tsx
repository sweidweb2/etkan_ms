import { Suspense } from "react";
import { ClassAnalyticsSection } from "@/components/manager/classes/class-analytics-section";
import { loadClassAnalyticsDeferredForManager } from "@/services/classes/class.service";

type AnalyticsSessionInput = {
  id: string;
  nb_order: number;
  starts_at: string;
  group_grade_level: string | null;
};

type AnalyticsTaskInput = {
  id: string;
  max_grade: number | null;
  started: boolean;
  started_at: string | null;
};

type ClassAnalyticsDeferredSectionProps = {
  classId: string;
  className: string;
  actorUserId: string | null;
  sessions?: AnalyticsSessionInput[];
  enrolledCount?: number;
  tasks?: AnalyticsTaskInput[];
};

export async function ClassAnalyticsDeferredSection({
  classId,
  className,
  actorUserId,
  sessions,
  enrolledCount,
  tasks,
}: ClassAnalyticsDeferredSectionProps) {
  const analytics = await loadClassAnalyticsDeferredForManager(
    actorUserId,
    classId,
    {
      sessions,
      enrolledCount,
      tasks,
    }
  );

  return (
    <ClassAnalyticsSection
      className={className}
      analytics={analytics}
      collapsible={false}
    />
  );
}

export function ClassAnalyticsDeferredFallback() {
  return (
    <div
      className="min-h-[12rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
      aria-hidden
    />
  );
}

export function ClassAnalyticsDeferred({
  classId,
  className,
  actorUserId,
  sessions,
  enrolledCount,
  tasks,
  enabled,
}: ClassAnalyticsDeferredSectionProps & { enabled: boolean }) {
  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={<ClassAnalyticsDeferredFallback />}>
      <ClassAnalyticsDeferredSection
        classId={classId}
        className={className}
        actorUserId={actorUserId}
        sessions={sessions}
        enrolledCount={enrolledCount}
        tasks={tasks}
      />
    </Suspense>
  );
}
