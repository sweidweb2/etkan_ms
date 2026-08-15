"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { ArrowUpRightIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { deletePublicProjectAction } from "@/app/manager/projects/actions";
import { Can } from "@/components/auth/can";
import { EditPublicProjectDialog } from "@/components/manager/projects/edit-public-project-dialog";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { PUBLIC_PROJECT_CLASSIFICATION_LABELS } from "@/lib/constants/manager-public-project";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  DeletePublicProjectActionState,
  ManagerPublicProjectRow,
} from "@/types/manager-public-project";

const initialDeleteState: DeletePublicProjectActionState = {};

type ProjectDetailsPanelProps = {
  project: ManagerPublicProjectRow;
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-foreground">
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function ProjectHrefValue({ href }: { href: string | null }) {
  if (!href) {
    return <span className="text-muted-foreground">—</span>;
  }

  const className =
    "inline-flex max-w-full items-start gap-1.5 break-all font-medium text-primary hover:underline";

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <span className="min-w-0">{href}</span>
        <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <span className="min-w-0">{href}</span>
      <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0" />
    </Link>
  );
}

export function ProjectDetailsPanel({ project }: ProjectDetailsPanelProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deletePublicProjectAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    setIsDeleteOpen
  );

  useActionStateToast(deleteState, isDeleteActionPending);

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.set("id", project.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_PROJECTS}>
              Manage projects
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{project.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EditPublicProjectDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        project={project}
        onProjectUpdated={() => router.refresh()}
      />

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{project.title}&quot; and its
              image. This action cannot be undone.
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
                  Deleting
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
          <CardTitle className="text-xl">{project.title}</CardTitle>
          <CardAction className="flex items-center gap-2 self-center">
            <Can permission={PERMISSIONS.PROJECTS_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </Can>
            <Can permission={PERMISSIONS.PROJECTS_DELETE}>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleteActionPending}
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-10">
            <dl className="order-2 flex min-w-0 flex-col gap-5 md:order-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
                  <DetailField
                    label="Classification"
                    value={
                      PUBLIC_PROJECT_CLASSIFICATION_LABELS[
                        project.classification
                      ]
                    }
                  />
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
                  <DetailField label="Category" value={project.category} />
                </div>
              </div>

              <DetailField label="Description" value={project.body} />

              <DetailField label="Link">
                <ProjectHrefValue href={project.href} />
              </DetailField>

              <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
                <DetailField
                  label="Created"
                  value={format(
                    new Date(project.created_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                />
                <DetailField
                  label="Updated"
                  value={format(
                    new Date(project.updated_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                />
              </div>
            </dl>

            <figure className="order-1 mx-auto w-full max-w-sm md:order-2 md:mx-0 md:max-w-none">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/40 p-2 shadow-sm">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="size-full object-cover"
                  />
                </div>
              </div>
            </figure>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
