"use client";

import { useActionState, useState, useTransition } from "react";
import { BookOpenIcon } from "lucide-react";
import { syncSubjectCatalogLinksAction } from "@/app/manager/subjects/catalog/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { SubjectCollapsibleSection } from "@/components/manager/subjects/subject-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type {
  ManagerExerciseRow,
  SyncSubjectCatalogLinksActionState,
} from "@/types/manager-exercise";

type SubjectCatalogLinksSectionProps = {
  subjectId: string;
  categories: ManagerCategoryRow[];
  exercises: ManagerExerciseRow[];
  initialCategoryIds: string[];
  initialExerciseIds: string[];
};

export function SubjectCatalogLinksSection({
  subjectId,
  categories,
  exercises,
  initialCategoryIds,
  initialExerciseIds,
}: SubjectCatalogLinksSectionProps) {
  const [categoryIds, setCategoryIds] = useState(initialCategoryIds);
  const [exerciseIds, setExerciseIds] = useState(initialExerciseIds);
  const [prevCategoryIds, setPrevCategoryIds] = useState(initialCategoryIds);
  const [prevExerciseIds, setPrevExerciseIds] = useState(initialExerciseIds);
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    syncSubjectCatalogLinksAction,
    {} as SyncSubjectCatalogLinksActionState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  if (initialCategoryIds !== prevCategoryIds) {
    setPrevCategoryIds(initialCategoryIds);
    setCategoryIds(initialCategoryIds);
  }
  if (initialExerciseIds !== prevExerciseIds) {
    setPrevExerciseIds(initialExerciseIds);
    setExerciseIds(initialExerciseIds);
  }

  function toggle(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string,
    checked: boolean
  ) {
    setter((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)
    );
  }

  function onSave() {
    const formData = new FormData();
    formData.set("subject_id", subjectId);
    for (const id of categoryIds) {
      formData.append("category_ids", id);
    }
    for (const id of exerciseIds) {
      formData.append("exercise_ids", id);
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <SubjectCollapsibleSection title="Categories & exercises" defaultOpen>
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="subject-linked-categories"
              label="Linked categories"
              hint="Optional"
            />
            <div
              id="subject-linked-categories"
              className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3"
            >
              {categories.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={BookOpenIcon}
                  title="No categories yet"
                  description="No categories in the catalog yet."
                />
              ) : (
                categories.map((category) => {
                  const id = `subject-category-${category.id}`;
                  return (
                    <label
                      key={category.id}
                      htmlFor={id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={id}
                        checked={categoryIds.includes(category.id)}
                        disabled={isPending}
                        onCheckedChange={(value) =>
                          toggle(setCategoryIds, category.id, value === true)
                        }
                      />
                      {category.name}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="subject-linked-exercises"
              label="Linked exercises"
              hint="Optional"
            />
            <div
              id="subject-linked-exercises"
              className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3"
            >
              {exercises.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={BookOpenIcon}
                  title="No exercises yet"
                  description="No exercises in the catalog yet."
                />
              ) : (
                exercises.map((exercise) => {
                  const id = `subject-exercise-${exercise.id}`;
                  return (
                    <label
                      key={exercise.id}
                      htmlFor={id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={id}
                        checked={exerciseIds.includes(exercise.id)}
                        disabled={isPending}
                        onCheckedChange={(value) =>
                          toggle(setExerciseIds, exercise.id, value === true)
                        }
                      />
                      <span className="min-w-0 truncate">{exercise.title}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
          <div className="flex justify-end">
            <Button type="button" disabled={isPending} onClick={onSave}>
              {isPending ? <InlineSpinner /> : null}
              Save links
            </Button>
          </div>
        </Can>
      </div>
    </SubjectCollapsibleSection>
  );
}
