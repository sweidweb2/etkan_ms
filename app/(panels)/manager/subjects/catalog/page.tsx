import { SubjectsCatalogPanel } from "@/components/manager/subjects/catalog/subjects-catalog-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCategoriesForManager } from "@/services/classes/category.service";
import { listExercisesForManager } from "@/services/classes/exercise.service";

export default async function ManagerSubjectsCatalogPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const userId = user?.id ?? null;

  const [categories, exercises] = await Promise.all([
    listCategoriesForManager(adminClient, userId).catch(() => []),
    listExercisesForManager(adminClient, userId).catch(() => []),
  ]);

  return (
    <SubjectsCatalogPanel
      initialCategories={categories}
      initialExercises={exercises}
    />
  );
}
