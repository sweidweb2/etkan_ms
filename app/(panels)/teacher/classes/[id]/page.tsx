import { notFound } from "next/navigation";
import { TeacherClassDetailsPanel } from "@/components/teacher/teacher-class-details-panel";
import { TeacherTaskGradeSummaryDeferred } from "@/components/teacher/teacher-task-grade-summary-deferred";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeachingClassPageBundleForSelf } from "@/services/classes/teacher-class-self.service";

type TeacherClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherClassDetailPage({
  params,
}: TeacherClassDetailPageProps) {
  const { id: classId } = await params;

  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const bundle = await getTeachingClassPageBundleForSelf(
    adminClient,
    actorUserId,
    classId
  );

  if (!bundle) {
    notFound();
  }

  // One deferred RSC tree shared by Tasks + Analytics (avoids double fetch).
  // Pass tasks from the page bundle so the deferred tree skips re-listing them.
  const gradeSummarySlot = (
    <TeacherTaskGradeSummaryDeferred
      classId={classId}
      actorUserId={actorUserId}
      tasks={bundle.tasks.map((task) => ({
        id: task.id,
        max_grade: task.max_grade,
      }))}
      showEmptyState
    />
  );

  return (
    <TeacherClassDetailsPanel
      classRow={bundle.classRow}
      initialSessions={bundle.sessions}
      initialWeekSkipState={bundle.weekSkipState}
      initialTasks={bundle.tasks}
      initialStudents={bundle.students}
      hasComputedGrades={bundle.hasComputedGrades}
      lockedUserIds={bundle.lockedUserIds}
      assignedAt={bundle.assignedAt}
      gradeSummarySlot={gradeSummarySlot}
    />
  );
}
