import { notFound } from "next/navigation";
import { TeacherClassDetailsPanel } from "@/components/teacher/teacher-class-details-panel";
import { TeacherTaskGradeSummaryDeferred } from "@/components/teacher/teacher-task-grade-summary-deferred";
import { getSessionUser } from "@/lib/auth/session";
import { parseTeacherClassDetailTab } from "@/lib/constants/teacher-class-detail-tabs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeachingClassPageBundleForSelf } from "@/services/classes/teacher-class-self.service";

type TeacherClassDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function TeacherClassDetailPage({
  params,
  searchParams,
}: TeacherClassDetailPageProps) {
  const { id: classId } = await params;
  const query = await searchParams;
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const initialTab = parseTeacherClassDetailTab(tabParam) ?? undefined;

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
  const gradeSummarySlot = (
    <TeacherTaskGradeSummaryDeferred
      classId={classId}
      actorUserId={actorUserId}
      showEmptyState
    />
  );

  return (
    <TeacherClassDetailsPanel
      classRow={bundle.classRow}
      initialSessions={bundle.sessions}
      initialTasks={bundle.tasks}
      initialStudents={bundle.students}
      hasComputedGrades={bundle.hasComputedGrades}
      assignedAt={bundle.assignedAt}
      initialTab={initialTab}
      gradeSummarySlot={gradeSummarySlot}
    />
  );
}
