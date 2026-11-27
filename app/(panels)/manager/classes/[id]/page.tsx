import { ClassAnalyticsDeferred } from "@/components/manager/classes/class-analytics-deferred-section";
import { ClassDetailsPanel } from "@/components/manager/classes/class-details-panel";
import { getSessionPack } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getManagerClassPageBundle } from "@/services/classes/manager-class-page-bundle.service";
import { notFound } from "next/navigation";

type ManagerClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassDetailPage({
  params,
}: ManagerClassDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const pack = await getSessionPack();

  const bundle = await getManagerClassPageBundle(adminClient, {
    classId: id,
    actorUserId: pack.user?.id ?? null,
    actorRole: pack.role,
    permissions: pack.permissions,
  });

  if (!bundle) {
    notFound();
  }

  const {
    classRow,
    sessions,
    weekSkipState,
    students,
    studentsTotalCount,
    tasks,
    teachers,
    finalExam,
    studentGrades,
    hasComputedGrades,
    lockedUserIds,
    canSessions,
    canStudents,
    canTasks,
    canAnalytics,
  } = bundle;

  return (
    <div className="flex flex-col gap-6">
      <ClassDetailsPanel
        classRow={classRow}
        initialSessions={sessions}
        initialWeekSkipState={weekSkipState}
        initialTasks={tasks}
        canViewTasks={canTasks}
        initialStudents={students}
        initialStudentsTotalCount={studentsTotalCount}
        initialAvailableStudents={[]}
        transferClassOptions={[]}
        initialFinalExam={finalExam}
        initialStudentGrades={studentGrades}
        initialTeachers={teachers}
        subjectOptions={[]}
        semesterOptions={[]}
        hasComputedGrades={hasComputedGrades}
        lockedUserIds={lockedUserIds}
        analyticsSlot={
          canAnalytics ? (
            <ClassAnalyticsDeferred
              classId={id}
              className={classRow.name}
              actorUserId={pack.user?.id ?? null}
              sessions={canSessions ? sessions : undefined}
              enrolledCount={canStudents ? studentsTotalCount : undefined}
              tasks={canTasks ? tasks : undefined}
              enabled
            />
          ) : null
        }
      />
    </div>
  );
}
