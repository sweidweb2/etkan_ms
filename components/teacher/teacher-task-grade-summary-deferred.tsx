import { Suspense } from "react";
import { ClipboardListIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SemiCircularGaugeCard } from "@/components/ui/semi-circular-gauge-card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeachingClassTaskGradeSummaryForSelf } from "@/services/classes/teacher-class-self.service";

type TeacherTaskGradeSummaryDeferredProps = {
  classId: string;
  actorUserId: string | null;
  /** From the class page bundle — avoids re-listing tasks in this deferred tree. */
  tasks: Array<{ id: string; max_grade: number | null }>;
  /** When false, show empty-state copy instead of hiding (Analytics tab). */
  showEmptyState?: boolean;
};

function TeacherTaskGradeSummaryFallback() {
  return (
    <div
      className="min-h-[10rem] max-w-sm animate-pulse rounded-xl border border-foreground/10 bg-muted/40"
      aria-hidden
    />
  );
}

async function TeacherTaskGradeSummarySection({
  classId,
  actorUserId,
  tasks,
  showEmptyState = false,
}: TeacherTaskGradeSummaryDeferredProps) {
  const adminClient = createSupabaseAdminClient();
  const summary = await getTeachingClassTaskGradeSummaryForSelf(
    adminClient,
    actorUserId,
    classId,
    tasks
  );

  if (!summary) {
    if (!showEmptyState) {
      return null;
    }
    return (
      <EmptyState
        size="sm"
        icon={ClipboardListIcon}
        title="No grade analytics yet"
        description="No task grade analytics yet for this class."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SemiCircularGaugeCard
        title="Task grades"
        titleTooltip="Class average of each student's combined task scores, compared with the maximum points across all tasks."
        value={summary.averageEarned}
        total={summary.totalMax}
        progressPercent={summary.progressPercent}
        valueLabel="Average"
        legendAverageLabel="Average"
        legendTotalLabel="Total"
        className="sm:max-w-sm"
      />
    </div>
  );
}

/**
 * Streams task grade analytics after the class shell, like manager deferred analytics.
 */
export function TeacherTaskGradeSummaryDeferred(
  props: TeacherTaskGradeSummaryDeferredProps
) {
  return (
    <Suspense fallback={<TeacherTaskGradeSummaryFallback />}>
      <TeacherTaskGradeSummarySection {...props} />
    </Suspense>
  );
}
