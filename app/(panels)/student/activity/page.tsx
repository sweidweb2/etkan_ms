import { StudentActivityTable } from "@/components/shared/student-activity-table";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentActivityForSelf } from "@/services/student-activity.service";

export default async function StudentActivityPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const rows = await listStudentActivityForSelf(adminClient, user?.id ?? null);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Audited events for your account. Only actions written to the audit log
          appear here.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <StudentActivityTable
          rows={rows}
          emptyMessage="No activity recorded for you yet."
        />
      </div>
    </div>
  );
}
