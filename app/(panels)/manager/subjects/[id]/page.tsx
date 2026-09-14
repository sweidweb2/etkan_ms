import { notFound } from "next/navigation";
import { SubjectDetailsPanel } from "@/components/manager/subjects/subject-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCategoriesForManager } from "@/services/classes/category.service";
import {
  listExercisesForManager,
  listSubjectCatalogLinksForManager,
} from "@/services/classes/exercise.service";
import { getSubjectDetailForManager } from "@/services/classes/subject.service";

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

  const detail = await getSubjectDetailForManager(adminClient, actorUserId, id);

  if (!detail) {
    notFound();
  }

  const [categories, exercises, links] = await Promise.all([
    listCategoriesForManager(adminClient, actorUserId).catch(() => []),
    listExercisesForManager(adminClient, actorUserId).catch(() => []),
    listSubjectCatalogLinksForManager(adminClient, actorUserId, id),
  ]);

  return (
    <SubjectDetailsPanel
      subject={detail.subject}
      classes={detail.classes}
      categories={categories}
      exercises={exercises}
      linkedCategoryIds={links.categoryIds}
      linkedExerciseIds={links.exerciseIds}
    />
  );
}
