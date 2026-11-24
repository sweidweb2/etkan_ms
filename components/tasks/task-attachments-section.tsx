"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileTextIcon } from "lucide-react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { TaskFileDropzone } from "@/components/tasks/task-file-dropzone";
import { TaskFileListRow } from "@/components/tasks/task-file-list-row";
import { EmptyState } from "@/components/ui/empty-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import { formatUploadFileSize } from "@/lib/classes/student-task-upload-format";
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

const MAX_MB = Math.round(TASK_ATTACHMENT_MAX_BYTES / (1024 * 1024));
const DROPZONE_HINT = `PDF, DOCX, XLSX, PNG, JPG · up to ${MAX_MB} MB each`;

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
  const fileInputKeyRef = useRef(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [prevAttachments, setPrevAttachments] = useState(initialAttachments);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
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
    setClientError(null);
    fileInputKeyRef.current += 1;
    setFileInputKey(fileInputKeyRef.current);
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

  function handleFile(file: File) {
    if (!uploadAction || isCloning || atCap || isUploadPending) {
      return;
    }
    setClientError(null);
    if (file.size > TASK_ATTACHMENT_MAX_BYTES) {
      setSelectedFileName(file.name);
      setClientError(
        `This file is ${formatUploadFileSize(file.size)}. Files must be under ${MAX_MB} MB.`
      );
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
    if (confirmDeleteId !== attachmentId) {
      setConfirmDeleteId(attachmentId);
      return;
    }
    const formData = new FormData();
    formData.set("id", attachmentId);
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

  const statusBadge = isCloning ? (
    <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
      Copying files…
    </span>
  ) : cloneFailed ? (
    <span className="inline-flex items-center rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
      Copy failed
    </span>
  ) : null;

  const fieldError =
    uploadState.fieldErrors?.file?.[0] ?? uploadState.error ?? null;
  const showUploadRow = isUploadPending && selectedFileName && !clientError;
  const showErrorRow = Boolean(clientError || fieldError) && selectedFileName;
  const showUploadPane = showMutations && !isCloning && !atCap;

  const filesList = (
    <>
      {showUploadRow ? (
        <TaskFileListRow
          fileName={selectedFileName!}
          isUploading
          uploadProgress={uploadProgress}
          className="border-t-0"
        />
      ) : null}

      {showErrorRow ? (
        <TaskFileListRow
          fileName={selectedFileName!}
          errorMessage={clientError ?? fieldError}
          onDismissError={() => {
            setClientError(null);
            setSelectedFileName(null);
          }}
          className={cn(!showUploadRow && "border-t-0")}
        />
      ) : null}

      {attachments.length === 0 && !showUploadRow && !showErrorRow ? (
        <div className="flex h-full min-h-28 items-center justify-center px-4 py-5">
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
                : showUploadPane
                  ? "Uploaded files will show here."
                  : showMutations
                    ? "File limit reached."
                    : "No files for this task."
            }
          />
        </div>
      ) : (
        <ul>
          {attachments.map((attachment, index) => {
            const isConfirming = confirmDeleteId === attachment.id;
            const isDeletingThis = isDeletePending && isConfirming;
            const isFirstVisible =
              index === 0 && !showUploadRow && !showErrorRow;
            return (
              <li key={attachment.id}>
                <TaskFileListRow
                  fileName={attachment.file_name}
                  mimeType={attachment.mime_type}
                  meta={
                    <>
                      {formatUploadFileSize(attachment.file_size)} ·{" "}
                      {format(new Date(attachment.created_at), "MMM d, yyyy")}
                    </>
                  }
                  isOpening={openingId === attachment.id}
                  canOpen
                  canDelete={showMutations && !isCloning}
                  isDeletePending={isDeletingThis}
                  isConfirmingDelete={isConfirming}
                  onOpen={() => void openAttachment(attachment)}
                  onDelete={() => handleDelete(attachment.id)}
                  onCancelConfirmDelete={() => setConfirmDeleteId(null)}
                  className={isFirstVisible ? "border-t-0" : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const panelBody = (
    <>
      {cloneFailed && cloneJob?.error_message ? (
        <p className="border-b border-border/60 px-4 py-3 text-sm text-destructive">
          {cloneJob.error_message}
        </p>
      ) : null}

      {showUploadPane ? (
        <div className="relative grid @lg/panel:grid-cols-2">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 @lg/panel:border-r @lg/panel:border-b-0">
            <TaskFileDropzone
              key={fileInputKey}
              inputId={inputId}
              accept={TASK_ATTACHMENT_ACCEPT}
              disabled={isUploadPending || isDeletePending}
              hint={DROPZONE_HINT}
              onFile={handleFile}
              className="min-h-[8.5rem] flex-1"
            />
          </div>
          <div className="@lg/panel:absolute @lg/panel:inset-y-0 @lg/panel:right-0 @lg/panel:w-1/2 @lg/panel:overflow-y-auto">
            {filesList}
          </div>
        </div>
      ) : (
        <div>{filesList}</div>
      )}
    </>
  );

  const header = (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="truncate text-[15px] font-medium tracking-tight">
          {title}
        </h3>
        <span className="inline-flex shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {attachments.length} of {TASK_ATTACHMENT_MAX_FILES}
        </span>
        {statusBadge}
      </div>
      {showMutations ? (
        <span className="shrink-0 text-xs text-muted-foreground">Optional</span>
      ) : null}
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
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {attachments.length} of {TASK_ATTACHMENT_MAX_FILES}
            </span>
            {statusBadge}
          </div>
        }
      >
        <div className={cn("overflow-hidden")}>{panelBody}</div>
      </ClassTabCollapsibleSection>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      {header}
      {panelBody}
    </div>
  );
}
