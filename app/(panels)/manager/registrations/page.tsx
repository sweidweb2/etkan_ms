import { ManageRegistrationsPanel } from "@/components/manager/registrations/manage-registrations-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listRegistrationApplicationsForManager } from "@/services/students/student-registration.service";

export default async function ManagerRegistrationsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const applications = await listRegistrationApplicationsForManager(
    adminClient,
    user?.id ?? null
  );

  return <ManageRegistrationsPanel initialApplications={applications} />;
}
