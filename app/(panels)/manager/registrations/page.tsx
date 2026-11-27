import { ManageRegistrationsPanel } from "@/components/manager/registrations/manage-registrations-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listRegistrationApplicationsPageForManager } from "@/services/students/student-registration.service";

export default async function ManagerRegistrationsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const data = await listRegistrationApplicationsPageForManager(
    adminClient,
    user?.id ?? null,
    { page: 1 }
  );

  return <ManageRegistrationsPanel initialData={data} />;
}
