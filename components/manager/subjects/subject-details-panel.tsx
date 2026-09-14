"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ExternalLinkIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { deleteSubjectAction } from "@/app/manager/subjects/actions";
import { Can } from "@/components/auth/can";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { SubjectCatalogLinksSection } from "@/components/manager/subjects/subject-catalog-links-section";
import { SubjectClassesSection } from "@/components/manager/subjects/subject-classes-section";
import { SubjectCollapsibleSection } from "@/components/manager/subjects/subject-collapsible-section";
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
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  DeleteSubjectActionState,
  ManagerSubjectRow,
} from "@/types/manager-subject";
import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type { ManagerExerciseRow } from "@/types/manager-exercise";

type SubjectDetailsPanelProps = {
  subject: ManagerSubjectRow;
  classes: ManagerSubjectClassRow[];
  categories: ManagerCategoryRow[];
  exercises: ManagerExerciseRow[];
  linkedCategoryIds: string[];
  linkedExerciseIds: string[];
};

const initialDeleteState: DeleteSubjectActionState = {};

const SUBJECT_HAS_CLASSES_DELETE_ERROR =
  "Remove or reassign linked classes before deleting this subject.";

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children ?? value ?? "—"}</dd>
    </div>
  );
}

function DetailLink({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return <DetailField label={label} value="—" />;
  }

  return (
    <DetailField label={label}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
      >
        Open link
        <ExternalLinkIcon className="size-3.5 shrink-0" />
      </a>
    </DetailField>
  );
}

export function SubjectDetailsPanel({
  subject: initialSubject,
  classes,
  categories,
  exercises,
  linkedCategoryIds,
  linkedExerciseIds,
}: SubjectDetailsPanelProps) {
  const [subject, setSubject] = useState<ManagerSubjectRow>(initialSubject);
  const [prevSubject, setPrevSubject] =
    useState<ManagerSubjectRow>(initialSubject);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteSubjectAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );

  useActionStateToast(deleteState, isDeleteActionPending);

  if (initialSubject !== prevSubject) {
    setPrevSubject(initialSubject);
    setSubject(initialSubject);
  }

  const hasLinkedClasses =
    subject.class_count > 0 || classes.length > 0;
  const deleteBlockedReason = hasLinkedClasses
    ? SUBJECT_HAS_CLASSES_DELETE_ERROR
    : undefined;

  const handleSubjectUpdated = (updated: ManagerSubjectRow) => {
    setSubject(updated);
  };

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("subject_id", subject.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={ROUTES.MANAGER_SUBJECTS}>
                Manage subjects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{subject.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Can
          anyOf={[
            PERMISSIONS.SUBJECTS_CATEGORIES_VIEW,
            PERMISSIONS.SUBJECTS_EXERCISES_VIEW,
          ]}
        >
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href={ROUTES.MANAGER_SUBJECTS_CATALOG} />}
          >
            Categories & exercises
          </Button>
        </Can>
      </div>

      <EditSubjectDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        subject={subject}
        onSubjectUpdated={handleSubjectUpdated}
      />

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete subject</DialogTitle>
            <DialogDescription>
              This will permanently delete {subject.name}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeleteActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleteActionPending}
            >
              {isDeleteActionPending ? (
                <>
                  <InlineSpinner />
                  Deleting subject
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{subject.name}</CardTitle>
          <CardAction className="flex items-center gap-2 self-center">
            <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit subject
              </Button>
            </Can>
            <Can permission={PERMISSIONS.SUBJECTS_DELETE}>
              <Button
                type="button"
                variant="destructive"
                disabled={hasLinkedClasses || isDeleteActionPending}
                title={deleteBlockedReason}
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete subject
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Name" value={subject.name} />
            <DetailLink label="Syllabus" href={subject.syllabus_link} />
            <DetailLink label="Reference" href={subject.reference_link} />
            <DetailLink label="Handout" href={subject.handout_link} />
            <DetailField label="Classes" value={String(classes.length)} />
            <DetailField
              label="Planned sessions"
              value={String(subject.nb_sessions)}
            />
            <DetailField
              label="Created"
              value={format(new Date(subject.created_at), "MMM d, yyyy 'at' h:mm a")}
            />
          </dl>
        </CardContent>
      </Card>

      <SubjectCatalogLinksSection
        subjectId={subject.id}
        categories={categories}
        exercises={exercises}
        initialCategoryIds={linkedCategoryIds}
        initialExerciseIds={linkedExerciseIds}
      />

      <SubjectCollapsibleSection
        title="Classes"
        description="Browse and filter classes in this subject."
        defaultOpen
      >
        <SubjectClassesSection classes={classes} subjectName={subject.name} />
      </SubjectCollapsibleSection>
    </div>
  );
}
