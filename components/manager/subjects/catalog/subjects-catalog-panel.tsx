"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import {
  deleteCategoryAction,
  deleteExerciseAction,
} from "@/app/manager/subjects/catalog/actions";
import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { CategoryFormDialog } from "@/components/manager/subjects/catalog/category-form-dialog";
import { ExerciseFormDialog } from "@/components/manager/subjects/catalog/exercise-form-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import {
  EXERCISE_LEVEL_LABELS,
} from "@/lib/constants/exercise-level";
import {
  EXERCISE_STATUS_LABELS,
} from "@/lib/constants/exercise-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { prependUniqueById } from "@/lib/utils/prepend-unique-by-id";
import type {
  DeleteCategoryActionState,
  ManagerCategoryRow,
} from "@/types/manager-category";
import type {
  DeleteExerciseActionState,
  ManagerExerciseRow,
} from "@/types/manager-exercise";

type CatalogTab = "categories" | "exercises";

type SubjectsCatalogPanelProps = {
  initialCategories: ManagerCategoryRow[];
  initialExercises: ManagerExerciseRow[];
};

function categoryDepthMap(categories: ManagerCategoryRow[]) {
  const byId = new Map(categories.map((row) => [row.id, row]));
  const depth = new Map<string, number>();

  function resolve(id: string, seen = new Set<string>()): number {
    if (depth.has(id)) {
      return depth.get(id)!;
    }
    if (seen.has(id)) {
      return 0;
    }
    seen.add(id);
    const parentId = byId.get(id)?.parent_id;
    const value = parentId ? resolve(parentId, seen) + 1 : 0;
    depth.set(id, value);
    return value;
  }

  for (const row of categories) {
    resolve(row.id);
  }
  return depth;
}

export function SubjectsCatalogPanel({
  initialCategories,
  initialExercises,
}: SubjectsCatalogPanelProps) {
  const [tab, setTab] = useState<CatalogTab>("categories");
  const [categories, setCategories] = useState(initialCategories);
  const [exercises, setExercises] = useState(initialExercises);
  const [search, setSearch] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ManagerCategoryRow | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<ManagerCategoryRow | null>(null);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] =
    useState<ManagerExerciseRow | null>(null);
  const [deletingExercise, setDeletingExercise] =
    useState<ManagerExerciseRow | null>(null);

  const [isTransitionPending, startTransition] = useTransition();
  const [deleteCategoryState, deleteCategoryFormAction, isDeleteCategoryPending] =
    useActionState(deleteCategoryAction, {} as DeleteCategoryActionState);
  const [deleteExerciseState, deleteExerciseFormAction, isDeleteExercisePending] =
    useActionState(deleteExerciseAction, {} as DeleteExerciseActionState);

  const isCategoryDeletePending =
    isDeleteCategoryPending || isTransitionPending;
  const isExerciseDeletePending =
    isDeleteExercisePending || isTransitionPending;

  const handleCategoryDeleteOpenChange = usePendingAwareOpenChange(
    isCategoryDeletePending,
    (open) => {
      if (!open) {
        setDeletingCategory(null);
      }
    }
  );
  const handleExerciseDeleteOpenChange = usePendingAwareOpenChange(
    isExerciseDeletePending,
    (open) => {
      if (!open) {
        setDeletingExercise(null);
      }
    }
  );

  useActionStateToast(deleteCategoryState, isCategoryDeletePending);
  useActionStateToast(deleteExerciseState, isExerciseDeletePending);

  useActionStateSuccess(deleteCategoryState, isCategoryDeletePending, () => {
    if (deletingCategory) {
      setCategories((prev) =>
        prev.filter((row) => row.id !== deletingCategory.id)
      );
    }
    setDeletingCategory(null);
  });

  useActionStateSuccess(deleteExerciseState, isExerciseDeletePending, () => {
    if (deletingExercise) {
      setExercises((prev) =>
        prev.filter((row) => row.id !== deletingExercise.id)
      );
    }
    setDeletingExercise(null);
  });

  const depths = useMemo(() => categoryDepthMap(categories), [categories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...categories]
      .filter((row) =>
        query ? row.name.toLowerCase().includes(query) : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, search]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter((row) => {
      if (!query) {
        return true;
      }
      return (
        row.title.toLowerCase().includes(query) ||
        row.categories.some((name) => name.toLowerCase().includes(query))
      );
    });
  }, [exercises, search]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={ROUTES.MANAGER_SUBJECTS}>Manage subjects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Categories & exercises</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Categories & exercises
        </h1>
        <p className="text-sm text-muted-foreground">
          Global catalogs you can attach to subjects.
        </p>
      </div>

      <TabsPrimitive
        value={tab}
        onValueChange={(value) => setTab(value as CatalogTab)}
      >
        <TabsListPrimitive className="mx-auto flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:w-fit">
          <TabsTriggerPrimitive value="categories" className="rounded-full px-4">
            Categories
          </TabsTriggerPrimitive>
          <TabsTriggerPrimitive value="exercises" className="rounded-full px-4">
            Exercises
          </TabsTriggerPrimitive>
        </TabsListPrimitive>
      </TabsPrimitive>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              tab === "categories"
                ? "Search categories…"
                : "Search exercises…"
            }
            className="ps-8"
          />
        </div>
        {tab === "categories" ? (
          <Can permission={PERMISSIONS.SUBJECTS_CATEGORIES_CREATE}>
            <Button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCategoryDialogOpen(true);
              }}
            >
              <PlusIcon />
              Add category
            </Button>
          </Can>
        ) : (
          <Can permission={PERMISSIONS.SUBJECTS_EXERCISES_CREATE}>
            <Button
              type="button"
              onClick={() => {
                setEditingExercise(null);
                setExerciseDialogOpen(true);
              }}
            >
              <PlusIcon />
              Add exercise
            </Button>
          </Can>
        )}
      </div>

      {tab === "categories" ? (
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  style={{ paddingInlineStart: 12 + (depths.get(category.id) ?? 0) * 16 }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {category.name}
                    </p>
                    {category.parent_id ? (
                      <p className="truncate text-xs text-muted-foreground">
                        Parent:{" "}
                        {categories.find((row) => row.id === category.parent_id)
                          ?.name ?? "—"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Can permission={PERMISSIONS.SUBJECTS_CATEGORIES_UPDATE}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                    </Can>
                    <Can permission={PERMISSIONS.SUBJECTS_CATEGORIES_DELETE}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => setDeletingCategory(category)}
                      >
                        <Trash2Icon />
                      </Button>
                    </Can>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredExercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises yet.</p>
          ) : (
            filteredExercises.map((exercise) => (
              <Card key={exercise.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {exercise.title}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {EXERCISE_LEVEL_LABELS[exercise.level]} ·{" "}
                      {EXERCISE_STATUS_LABELS[exercise.status]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Can permission={PERMISSIONS.SUBJECTS_EXERCISES_UPDATE}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${exercise.title}`}
                        onClick={() => {
                          setEditingExercise(exercise);
                          setExerciseDialogOpen(true);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                    </Can>
                    <Can permission={PERMISSIONS.SUBJECTS_EXERCISES_DELETE}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${exercise.title}`}
                        onClick={() => setDeletingExercise(exercise)}
                      >
                        <Trash2Icon />
                      </Button>
                    </Can>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {exercise.categories.join(", ")}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
          }
        }}
        categories={categories}
        category={editingCategory}
        onSaved={(saved) => {
          setCategories((prev) => {
            const exists = prev.some((row) => row.id === saved.id);
            if (exists) {
              return prev.map((row) => (row.id === saved.id ? saved : row));
            }
            return prependUniqueById(prev, saved);
          });
        }}
      />

      <ExerciseFormDialog
        open={exerciseDialogOpen}
        onOpenChange={(open) => {
          setExerciseDialogOpen(open);
          if (!open) {
            setEditingExercise(null);
          }
        }}
        categories={categories}
        exercise={editingExercise}
        onSaved={(saved) => {
          setExercises((prev) => {
            const exists = prev.some((row) => row.id === saved.id);
            if (exists) {
              return prev.map((row) => (row.id === saved.id ? saved : row));
            }
            return prependUniqueById(prev, saved);
          });
        }}
      />

      <Dialog
        open={Boolean(deletingCategory)}
        onOpenChange={handleCategoryDeleteOpenChange}
      >
        <DialogContent showCloseButton={!isCategoryDeletePending}>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              Delete “{deletingCategory?.name}”? This fails if the category is
              still linked to exercises or subjects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isCategoryDeletePending}
              onClick={() => handleCategoryDeleteOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCategoryDeletePending}
              onClick={() => {
                if (!deletingCategory) {
                  return;
                }
                const formData = new FormData();
                formData.set("category_id", deletingCategory.id);
                startTransition(() => {
                  deleteCategoryFormAction(formData);
                });
              }}
            >
              {isCategoryDeletePending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingExercise)}
        onOpenChange={handleExerciseDeleteOpenChange}
      >
        <DialogContent showCloseButton={!isExerciseDeletePending}>
          <DialogHeader>
            <DialogTitle>Delete exercise</DialogTitle>
            <DialogDescription>
              Delete “{deletingExercise?.title}”? This fails if the exercise is
              still linked to subjects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isExerciseDeletePending}
              onClick={() => handleExerciseDeleteOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isExerciseDeletePending}
              onClick={() => {
                if (!deletingExercise) {
                  return;
                }
                const formData = new FormData();
                formData.set("exercise_id", deletingExercise.id);
                startTransition(() => {
                  deleteExerciseFormAction(formData);
                });
              }}
            >
              {isExerciseDeletePending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
