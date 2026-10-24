import { Suspense } from "react";
import { StudentActivitySection } from "@/components/manager/students/student-activity-section";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentActivityForManager } from "@/services/students/student-activity.service";

type StudentActivityDeferredSectionProps = {
  actorUserId: string | null;
  studentUserId: string;
};

async function StudentActivityDeferredSection({
  actorUserId,
  studentUserId,
}: StudentActivityDeferredSectionProps) {
  const adminClient = createSupabaseAdminClient();
  const rows = await listStudentActivityForManager(
    adminClient,
    actorUserId,
    studentUserId
  );

  return <StudentActivitySection rows={rows} />;
}

function StudentActivityDeferredFallback() {
  return (
    <div
      className="min-h-[10rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
      aria-hidden
    />
  );
}

export function StudentActivityDeferred({
  actorUserId,
  studentUserId,
}: StudentActivityDeferredSectionProps) {
  return (
    <Suspense fallback={<StudentActivityDeferredFallback />}>
      <StudentActivityDeferredSection
        actorUserId={actorUserId}
        studentUserId={studentUserId}
      />
    </Suspense>
  );
}
