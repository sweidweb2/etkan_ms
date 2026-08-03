import { notFound } from "next/navigation";
import { InstructorWorkshopDetailsPanel } from "@/components/instructor/workshops/instructor-workshop-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkshopForInstructor } from "@/services/instructor-workshop.service";

type InstructorWorkshopDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InstructorWorkshopDetailPage({
  params,
}: InstructorWorkshopDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const detail = await getWorkshopForInstructor(
    adminClient,
    user?.id ?? null,
    id
  );

  if (!detail) {
    notFound();
  }

  return (
    <InstructorWorkshopDetailsPanel
      workshop={detail.workshop}
      sessions={detail.sessions}
      assignmentRole={detail.assignmentRole}
    />
  );
}
