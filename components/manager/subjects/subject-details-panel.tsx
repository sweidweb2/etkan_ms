"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ExternalLinkIcon,
  LockIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { deleteSubjectAction } from "@/app/manager/subjects/actions";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/components/auth/permissions-provider";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { SubjectCatalogLinksSection } from "@/components/manager/subjects/subject-catalog-links-section";
import { SubjectClassesSection } from "@/components/manager/subjects/subject-classes-section";
import { SubjectTasksSection } from "@/components/manager/subjects/subject-tasks-section";
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
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  DeleteSubjectActionState,
  ManagerSubjectRow,
} from "@/types/manager-subject";
import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";
import type { ManagerSubjectTaskRow } from "@/types/manager-subject-task";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type { ManagerExerciseRow } from "@/types/manager-exercise";

type SubjectDetailsPanelProps = {
  subject: ManagerSubjectRow;
  classes: ManagerSubjectClassRow[];
  categories: ManagerCategoryRow[];
  exercises: ManagerExerciseRow[];
  linkedCategoryIds: string[];
  linkedExerciseIds: string[];
  tasks?: ManagerSubjectTaskRow[];
};

const initialDeleteState: DeleteSubjectActionState = {};

const SUBJECT_HAS_CLASSES_DELETE_ERROR =
  "Remove or reassign linked classes before deleting this subject.";

type SubjectDetailTab = "details" | "catalog" | "tasks" | "classes";

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

function DetailLink({ href, label }: { href: string | null; label: string }) {
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
  tasks = [],
}: SubjectDetailsPanelProps) {
  const [subject, setSubject] = useState<ManagerSubjectRow>(initialSubject);
  const [prevSubject, setPrevSubject] =
    useState<ManagerSubjectRow>(initialSubject);
  const [activeTab, setActiveTab] = useState<SubjectDetailTab>("classes");
  const permissions = usePermissions();
  const canViewTasks = hasPermissionInSet(
    permissions,
    PERMISSIONS.SUBJECTS_TASKS_VIEW,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteSubjectAction,
    initialDeleteState,
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen,
  );

  useActionStateToast(deleteState, isDeleteActionPending);

  if (initialSubject !== prevSubject) {
    setPrevSubject(initialSubject);
    setSubject(initialSubject);
  }

  const hasLinkedClasses = subject.class_count > 0 || classes.length > 0;
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
      <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
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

        <Can permission={PERMISSIONS.SUBJECTS_VIEW}>
          <Button
            type="button"
            variant="outline"
            disabled
            aria-disabled
            title="Coming soon"
            className="disabled:cursor-not-allowed"
          >
            <LockIcon data-icon="inline-start" aria-hidden />
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

      <TabsPrimitive
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SubjectDetailTab)}
        className="flex flex-col gap-4"
      >
        <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center justify-center gap-2 self-center rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 @lg/panel:w-fit">
          <TabsTriggerPrimitive value="classes" className={TAB_TRIGGER_CLASS}>
            Classes
          </TabsTriggerPrimitive>
          {canViewTasks ? (
            <TabsTriggerPrimitive value="tasks" className={TAB_TRIGGER_CLASS}>
              Tasks
            </TabsTriggerPrimitive>
          ) : null}
          <TabsTriggerPrimitive value="details" className={TAB_TRIGGER_CLASS}>
            Details
          </TabsTriggerPrimitive>
          <TabsTriggerPrimitive
            value="catalog"
            disabled
            aria-disabled
            title="Coming soon"
            className={cn(
              TAB_TRIGGER_CLASS,
              "gap-1.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:hover:shadow-none",
            )}
          >
            <LockIcon className="size-3.5 shrink-0" aria-hidden />
            Categories & exercises
          </TabsTriggerPrimitive>
        </TabsListPrimitive>

        <TabsContentsPrimitive>
          <TabsContentPrimitive value="classes" className="outline-none">
            <SubjectClassesSection
              classes={classes}
              subjectName={subject.name}
            />
          </TabsContentPrimitive>

          {canViewTasks ? (
            <TabsContentPrimitive value="tasks" className="outline-none">
              <SubjectTasksSection
                subjectId={subject.id}
                subjectName={subject.name}
                tasks={tasks}
              />
            </TabsContentPrimitive>
          ) : null}

          <TabsContentPrimitive value="details" className="outline-none">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
                <h2 className="text-xl font-semibold">{subject.name}</h2>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
              <Card>
                <CardContent>
                  <dl className="grid gap-4 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3">
                    <DetailField label="Name" value={subject.name} />
                    <DetailLink label="Syllabus" href={subject.syllabus_link} />
                    <DetailLink
                      label="Reference"
                      href={subject.reference_link}
                    />
                    <DetailLink label="Handout" href={subject.handout_link} />
                    <DetailField
                      label="Classes"
                      value={String(classes.length)}
                    />
                    <DetailField
                      label="Planned sessions"
                      value={String(subject.nb_sessions)}
                    />
                    <DetailField
                      label="Created"
                      value={format(
                        new Date(subject.created_at),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    />
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContentPrimitive>

          <TabsContentPrimitive value="catalog" className="outline-none">
            <SubjectCatalogLinksSection
              subjectId={subject.id}
              categories={categories}
              exercises={exercises}
              initialCategoryIds={linkedCategoryIds}
              initialExerciseIds={linkedExerciseIds}
            />
          </TabsContentPrimitive>
        </TabsContentsPrimitive>
      </TabsPrimitive>
    </div>
  );
}
