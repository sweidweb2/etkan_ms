"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ExternalLinkIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { UploadTaskAttachmentDialog } from "@/components/tasks/upload-task-attachment-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import {
  TASK_ATTACHMENT_CLONE_JOB_STATUSES,
  TASK_ATTACHMENT_MAX_FILES,
  type TaskAttachmentEntity,
} from "@/lib/constants/task-attachments";
import { cn } from "@/lib/utils";
import type {
  DeleteTaskAttachmentActionState,
  TaskAttachmentCloneJobRow,
  TaskAttachmentRow,
  TaskAttachmentSignedUrlActionState,
  UploadTaskAttachmentActionState,
} from "@/types/task-attachment";

const initialDeleteState: DeleteTaskAttachmentActionState = {};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TaskAttachmentsSectionProps = {
  entity: TaskAttachmentEntity;
  entityId: string;
  attachments: TaskAttachmentRow[];
  cloneJob?: TaskAttachmentCloneJobRow | null;
  canMutate?: boolean;
  mutationsLocked?: boolean;
  collapsible?: boolean;
  storageKey?: string;
  title?: string;
  uploadAction?: (
    prevState: UploadTaskAttachmentActionState,
    formData: FormData
  ) => Promise<UploadTaskAttachmentActionState>;
  deleteAction?: (
    prevState: DeleteTaskAttachmentActionState,
    formData: FormData
  ) => Promise<DeleteTaskAttachmentActionState>;
  getSignedUrlAction: (
    formData: FormData
  ) => Promise<TaskAttachmentSignedUrlActionState>;
  /** Student helper that takes an id string instead of FormData. */
  getSignedUrlById?: (
    id: string
  ) => Promise<TaskAttachmentSignedUrlActionState>;
  onAttachmentsChange?: (rows: TaskAttachmentRow[]) => void;
};

export function TaskAttachmentsSection({
  entity,
  entityId,
  attachments: initialAttachments,
  cloneJob = null,
  canMutate = false,
  mutationsLocked = false,
  collapsible = true,
  storageKey,
  title = "Task files",
  uploadAction,
  deleteAction,
  getSignedUrlAction,
  getSignedUrlById,
  onAttachmentsChange,
}: TaskAttachmentsSectionProps) {
  const router = useRouter();
  const [attachments, setAttachments] = useState(initialAttachments);
  const [prevAttachments, setPrevAttachments] = useState(initialAttachments);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingAttachment, setDeletingAttachment] =
    useState<TaskAttachmentRow | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteAction ?? (async () => initialDeleteState),
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    (open) => {
      if (!open) {
        setDeletingAttachment(null);
      }
    }
  );

  const isCloning =
    cloneJob?.status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING ||
    cloneJob?.status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.RUNNING;
  const cloneFailed =
    cloneJob?.status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.FAILED;
  const atCap = attachments.length >= TASK_ATTACHMENT_MAX_FILES;
  const showMutations =
    canMutate && !mutationsLocked && Boolean(uploadAction) && Boolean(deleteAction);

  if (initialAttachments !== prevAttachments) {
    setPrevAttachments(initialAttachments);
    setAttachments(initialAttachments);
  }

  useEffect(() => {
    if (!isCloning) {
      return;
    }
    const timerId = window.setInterval(() => {
      router.refresh();
    }, 2500);
    return () => {
      window.clearInterval(timerId);
    };
  }, [isCloning, router]);

  useActionStateToast(deleteState, isDeleteActionPending);
  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    if (deletingAttachment) {
      setAttachments((current) => {
        const next = current.filter(
          (row) => row.id !== deletingAttachment.id
        );
        onAttachmentsChange?.(next);
        return next;
      });
    }
    setDeletingAttachment(null);
  });

  function handleConfirmDelete() {
    if (!deletingAttachment || !deleteAction) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deletingAttachment.id);
    startTransition(() => {
      deleteFormAction(formData);
    });
  }

  async function openAttachment(attachment: TaskAttachmentRow) {
    setOpeningId(attachment.id);
    try {
      let result: TaskAttachmentSignedUrlActionState;
      if (getSignedUrlById) {
        result = await getSignedUrlById(attachment.id);
      } else {
        const formData = new FormData();
        formData.set("id", attachment.id);
        result = await getSignedUrlAction(formData);
      }
      if (!result.success || !result.signedUrl) {
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningId(null);
    }
  }

  const badge = isCloning ? (
    <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
      Copying files…
    </span>
  ) : cloneFailed ? (
    <span className="inline-flex items-center rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
      Copy failed
    </span>
  ) : null;

  const headerAction =
    showMutations && !isCloning && !atCap ? (
      <Button type="button" size="sm" onClick={() => setIsUploadOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        Upload
      </Button>
    ) : null;

  const body = (
    <div className={cn(collapsible ? "px-3 py-4 sm:px-4" : "py-1")}>
      {badge && !collapsible ? <div className="mb-3">{badge}</div> : null}
      {cloneFailed && cloneJob?.error_message ? (
        <p className="mb-3 text-sm text-destructive">{cloneJob.error_message}</p>
      ) : null}
      {attachments.length === 0 ? (
        <EmptyState
          size="sm"
          icon={FileTextIcon}
          title={
            isCloning
              ? "Copying files from subject…"
              : "No files attached yet"
          }
          description={
            isCloning
              ? "Attachments will appear here when the copy finishes."
              : showMutations
                ? "Upload files related to this task."
                : "No files for this task."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Name</th>
                <th className="pb-2 pr-3 font-medium">Size</th>
                <th className="pb-2 pr-3 font-medium">Uploaded</th>
                <th className="pb-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((attachment) => (
                <tr
                  key={attachment.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="py-3 pr-3 align-top font-medium text-foreground">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-left text-foreground underline-offset-4 hover:underline"
                      onClick={() => void openAttachment(attachment)}
                      disabled={openingId === attachment.id}
                    >
                      {attachment.file_name}
                      {openingId === attachment.id ? (
                        <InlineSpinner className="size-3.5" />
                      ) : (
                        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 pr-3 align-top text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </td>
                  <td className="py-3 pr-3 align-top text-muted-foreground">
                    {format(new Date(attachment.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="py-3 align-top">
                    {showMutations && !isCloning ? (
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${attachment.file_name}`}
                          onClick={() => setDeletingAttachment(attachment)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
      {showMutations && uploadAction ? (
        <UploadTaskAttachmentDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          entity={entity}
          entityId={entityId}
          uploadAction={uploadAction}
          onUploaded={(attachment) => {
            setAttachments((current) => {
              const next = current.some((row) => row.id === attachment.id)
                ? current.map((row) =>
                    row.id === attachment.id ? attachment : row
                  )
                : [...current, attachment];
              onAttachmentsChange?.(next);
              return next;
            });
          }}
        />
      ) : null}

      <Dialog
        open={Boolean(deletingAttachment)}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              {deletingAttachment?.file_name?.trim()
                ? deletingAttachment.file_name
                : "this file"}
              ? This cannot be undone.
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
              {isDeleteActionPending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {collapsible ? (
        <ClassTabCollapsibleSection
          title={title}
          storageKey={
            storageKey ?? `task-attachments-v1:${entity}:${entityId}`
          }
          defaultOpen
          action={
            <div className="flex items-center gap-2">
              {badge}
              {headerAction}
            </div>
          }
        >
          {body}
        </ClassTabCollapsibleSection>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              {badge}
            </div>
            {headerAction}
          </div>
          {body}
        </div>
      )}
    </>
  );
}
