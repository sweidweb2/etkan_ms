import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TeacherClassDetailsPanel } from "@/components/teacher/teacher-class-details-panel";
import { PanelRouteLoading } from "@/components/loaders/panel-route-loading";
import { getSessionUser } from "@/lib/auth/session";
import { parseTeacherClassDetailTab } from "@/lib/constants/teacher-class-detail-tabs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClassComputedGradeLockStateForManager } from "@/services/classes/class-computed-grade-lock.service";
import {
  getClassForManager,
  listClassStudentsForManager,
} from "@/services/classes/class.service";
import {
  getTeachingClassDetailForSelf,
  getTeachingClassTaskGradeSummaryForSelf,
} from "@/services/classes/teacher-class-self.service";

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

  const teachingDetail = await getTeachingClassDetailForSelf(
    adminClient,
    actorUserId,
    classId
  );

  if (!teachingDetail) {
    notFound();
  }

  const [classRow, computedGradeLock, taskGradeSummary, students] =
    await Promise.all([
      getClassForManager(adminClient, actorUserId, classId),
      getClassComputedGradeLockStateForManager(adminClient, actorUserId, classId),
      getTeachingClassTaskGradeSummaryForSelf(adminClient, actorUserId, classId),
      listClassStudentsForManager(adminClient, actorUserId, classId),
    ]);

  if (!classRow) {
    notFound();
  }

  return (
    <Suspense fallback={<PanelRouteLoading />}>
      <TeacherClassDetailsPanel
        classRow={classRow}
        initialSessions={teachingDetail.sessions}
        initialTasks={teachingDetail.tasks}
        initialStudents={students}
        hasComputedGrades={computedGradeLock.hasComputedGrades}
        assignedAt={teachingDetail.classRow.assigned_at}
        taskGradeSummary={taskGradeSummary}
        initialTab={initialTab}
      />
    </Suspense>
  );
}
