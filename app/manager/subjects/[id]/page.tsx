import { notFound } from "next/navigation";
import { SubjectDetailsPanel } from "@/components/manager/subjects/subject-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSubjectForManager,
  listSubjectClassesForManager,
} from "@/services/subject.service";

type ManagerSubjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSubjectDetailPage({
  params,
}: ManagerSubjectDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();

  const [subject, classes] = await Promise.all([
    getSubjectForManager(adminClient, role, id),
    listSubjectClassesForManager(adminClient, role, id),
  ]);

  if (!subject) {
    notFound();
  }

  return <SubjectDetailsPanel subject={subject} classes={classes} />;
}
