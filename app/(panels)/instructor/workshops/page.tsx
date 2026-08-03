import { InstructorWorkshopsPanel } from "@/components/instructor/workshops/instructor-workshops-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listWorkshopsForInstructor } from "@/services/instructor-workshop.service";

export default async function InstructorWorkshopsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const workshops = await listWorkshopsForInstructor(
    adminClient,
    user?.id ?? null
  );

  return <InstructorWorkshopsPanel initialWorkshops={workshops} />;
}
