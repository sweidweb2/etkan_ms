import { notFound } from "next/navigation";
import { SubjectDetailsPanel } from "@/components/manager/subjects/subject-details-panel";
import { getSessionUser } from "@/lib/auth/session";
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
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [subject, classes] = await Promise.all([
    getSubjectForManager(adminClient, actorUserId, id),
    listSubjectClassesForManager(adminClient, actorUserId, id),
  ]);

  if (!subject) {
    notFound();
  }

  return <SubjectDetailsPanel subject={subject} classes={classes} />;
}
