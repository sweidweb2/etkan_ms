"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ExternalLinkIcon,
  FileTextIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { FieldLabel } from "@/components/auth/field-label";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import {
  TASK_ATTACHMENT_ACCEPT,
  TASK_ATTACHMENT_CLONE_JOB_STATUSES,
  TASK_ATTACHMENT_MAX_BYTES,
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

const initialUploadState: UploadTaskAttachmentActionState = {};
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
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [prevAttachments, setPrevAttachments] = useState(initialAttachments);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploadTransitionPending, startUploadTransition] = useTransition();
  const [isDeleteTransitionPending, startDeleteTransition] = useTransition();

  const [uploadState, uploadFormAction, isUploadActionPending] = useActionState(
    uploadAction ?? (async () => initialUploadState),
    initialUploadState
  );
  const [deleteState, deleteFormAction, isDeleteActionPending] = useActionState(
    deleteAction ?? (async () => initialDeleteState),
    initialDeleteState
  );

  const isUploadPending = isUploadActionPending || isUploadTransitionPending;
  const isDeletePending = isDeleteActionPending || isDeleteTransitionPending;
  const uploadProgress = useSimulatedProgressPercent(isUploadPending);

  const isCloning =
    cloneJob?.status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.PENDING ||
    cloneJob?.status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.RUNNING;
  const cloneFailed =
    cloneJob?.status === TASK_ATTACHMENT_CLONE_JOB_STATUSES.FAILED;
  const atCap = attachments.length >= TASK_ATTACHMENT_MAX_FILES;
  const showMutations =
    canMutate &&
    !mutationsLocked &&
    Boolean(uploadAction) &&
    Boolean(deleteAction);

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

  useActionStateToast(uploadState, isUploadPending);
  useActionStateToast(deleteState, isDeletePending);

  useActionStateSuccess(uploadState, isUploadPending, (nextState) => {
    if (!nextState.attachment) {
      return;
    }
    const uploaded = nextState.attachment;
    setAttachments((current) => {
      const next = current.some((row) => row.id === uploaded.id)
        ? current.map((row) => (row.id === uploaded.id ? uploaded : row))
        : [...current, uploaded];
      queueMicrotask(() => onAttachmentsChange?.(next));
      return next;
    });
    setSelectedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  });

  useActionStateSuccess(deleteState, isDeletePending, () => {
    const removedId = confirmDeleteId;
    if (!removedId) {
      return;
    }
    setAttachments((current) => {
      const next = current.filter((row) => row.id !== removedId);
      queueMicrotask(() => onAttachmentsChange?.(next));
      return next;
    });
    setConfirmDeleteId(null);
  });

  function handleFileChange(file: File | null) {
    if (!file || !uploadAction || isCloning || atCap) {
      return;
    }
    setSelectedFileName(file.name);
    const formData = new FormData();
    formData.set("entity", entity);
    formData.set("entity_id", entityId);
    formData.set("file", file);
    startUploadTransition(() => {
      uploadFormAction(formData);
    });
  }

  function handleDelete(attachmentId: string) {
    if (!deleteAction) {
      return;
    }
    const formData = new FormData();
    formData.set("id", attachmentId);
    setConfirmDeleteId(attachmentId);
    startDeleteTransition(() => {
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

  const body = (
    <div className={cn("flex flex-col gap-4", collapsible ? "px-3 py-4 sm:px-4" : "py-1")}>
      {badge && !collapsible ? <div>{badge}</div> : null}
      {cloneFailed && cloneJob?.error_message ? (
        <p className="text-sm text-destructive">{cloneJob.error_message}</p>
      ) : null}

      {showMutations && !isCloning && !atCap ? (
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={inputId}
            label="Add file"
            hint={`Optional · max ${Math.round(TASK_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB · up to ${TASK_ATTACHMENT_MAX_FILES}`}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept={TASK_ATTACHMENT_ACCEPT}
              disabled={isUploadPending || isDeletePending}
              className="sm:max-w-md"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                handleFileChange(file);
              }}
            />
            {isUploadPending ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <InlineSpinner className="size-3.5" />
                Uploading{selectedFileName ? ` ${selectedFileName}` : "…"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <UploadIcon className="size-3.5" />
                Choose a file to upload
              </span>
            )}
          </div>
          {isUploadPending ? (
            <div className="h-1.5 max-w-md overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          ) : null}
          {uploadState.fieldErrors?.file?.[0] ? (
            <p className="text-sm text-destructive">
              {uploadState.fieldErrors.file[0]}
            </p>
          ) : null}
        </div>
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
                ? "Use the file input above to attach files."
                : "No files for this task."
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {attachments.map((attachment) => {
            const isConfirming = confirmDeleteId === attachment.id;
            const isDeletingThis = isDeletePending && isConfirming;
            return (
              <li
                key={attachment.id}
                className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 px-3 py-3"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileTextIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-1.5 text-left text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    onClick={() => void openAttachment(attachment)}
                    disabled={openingId === attachment.id || isDeletingThis}
                  >
                    <span className="truncate">{attachment.file_name}</span>
                    {openingId === attachment.id ? (
                      <InlineSpinner className="size-3.5 shrink-0" />
                    ) : (
                      <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)} ·{" "}
                    {format(new Date(attachment.created_at), "MMM d, yyyy")}
                  </p>
                  {isConfirming && !isDeletingThis ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-destructive">Delete this file?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isDeletePending}
                        onClick={() => handleDelete(attachment.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isDeletePending}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </div>
                {showMutations && !isCloning ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={
                      isConfirming
                        ? `Confirm delete ${attachment.file_name}`
                        : `Delete ${attachment.file_name}`
                    }
                    disabled={isUploadPending || isDeletePending}
                    onClick={() => {
                      if (isConfirming) {
                        setConfirmDeleteId(null);
                        return;
                      }
                      setConfirmDeleteId(attachment.id);
                    }}
                  >
                    {isDeletingThis ? <InlineSpinner /> : <Trash2Icon />}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (collapsible) {
    return (
      <ClassTabCollapsibleSection
        title={title}
        storageKey={
          storageKey ?? `task-attachments-v1:${entity}:${entityId}`
        }
        defaultOpen
        action={badge}
      >
        {body}
      </ClassTabCollapsibleSection>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {badge}
        </div>
      </div>
      <div className="px-3 sm:px-4">{body}</div>
    </div>
  );
}
