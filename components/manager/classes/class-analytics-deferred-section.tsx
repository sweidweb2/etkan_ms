import { Suspense } from "react";
import { ClassAnalyticsSection } from "@/components/manager/classes/class-analytics-section";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassAnalyticsForManager } from "@/services/classes/class.service";

type ClassAnalyticsDeferredSectionProps = {
  classId: string;
  className: string;
  actorUserId: string | null;
};

export async function ClassAnalyticsDeferredSection({
  classId,
  className,
  actorUserId,
}: ClassAnalyticsDeferredSectionProps) {
  const adminClient = createSupabaseAdminClient();
  const analytics = await getClassAnalyticsForManager(
    adminClient,
    actorUserId,
    classId
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
      />
    </Suspense>
  );
}
