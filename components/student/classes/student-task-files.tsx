"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { FileIcon } from "lucide-react";
import {
  deleteStudentTaskUploadForSelfAction,
  getStudentTaskUploadSignedUrlForSelfAction,
  uploadStudentTaskFileForSelfAction,
} from "@/app/(panels)/student/classes/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { TaskFileDropzone } from "@/components/tasks/task-file-dropzone";
import { TaskFileListRow } from "@/components/tasks/task-file-list-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import { formatUploadFileSize } from "@/lib/classes/student-task-upload-format";
import {
  STUDENT_TASK_UPLOAD_ACCEPT,
  STUDENT_TASK_UPLOAD_MAX_BYTES,
  STUDENT_TASK_UPLOAD_MAX_FILES,
} from "@/lib/constants/manager-student-task-uploads";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  DeleteStudentTaskUploadActionState,
  StudentTaskUploadActionState,
  StudentTaskUploadForSelf,
} from "@/types/student-class";

const initialUploadState: StudentTaskUploadActionState = {};
const initialDeleteState: DeleteStudentTaskUploadActionState = {};

const MAX_MB = Math.round(STUDENT_TASK_UPLOAD_MAX_BYTES / (1024 * 1024));
const DROPZONE_HINT = `PDF, DOCX, XLSX, PNG, JPG · up to ${MAX_MB} MB each`;

type StudentTaskFilesProps = {
  studentTaskId: string | null;
  uploads: StudentTaskUploadForSelf[];
  /** Uploads are only allowed once the class task has been started. */
  started?: boolean;
};

export function StudentTaskFiles({
  studentTaskId,
  uploads: initialUploads = [],
  started = true,
}: StudentTaskFilesProps) {
  const inputId = useId();
  const fileInputKeyRef = useRef(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploads, setUploads] = useState(initialUploads);
  const [prevUploads, setPrevUploads] = useState(initialUploads);
  const [pendingDelete, setPendingDelete] =
    useState<StudentTaskUploadForSelf | null>(null);
  const [deleteComplete, setDeleteComplete] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  if (initialUploads !== prevUploads) {
    setPrevUploads(initialUploads);
    setUploads(initialUploads);
  }

  const [uploadState, uploadAction, isUploadPending] = useFormActionState(
    uploadStudentTaskFileForSelfAction,
    initialUploadState
  );
  const [deleteState, deleteAction, isDeletePending] = useFormActionState(
    deleteStudentTaskUploadForSelfAction,
    initialDeleteState
  );
  const uploadProgress = useSimulatedProgressPercent(isUploadPending);
  const deleteProgress = useSimulatedProgressPercent(
    isDeletePending && !deleteComplete
  );
  const shownDeleteProgress = deleteComplete ? 100 : deleteProgress;
  const deleteBusy = isDeletePending || deleteComplete;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    deleteBusy,
    (open) => {
      if (!open) {
        setPendingDelete(null);
        setDeleteComplete(false);
      }
    }
  );

  useActionStateToast(uploadState, isUploadPending);
  useActionStateToast(deleteState, isDeletePending);

  useActionStateSuccess(uploadState, isUploadPending, (nextState) => {
    if (nextState.upload) {
      setUploads((current) =>
        current.some((row) => row.id === nextState.upload!.id)
          ? current
          : [nextState.upload!, ...current]
      );
    }
    setSelectedFileName(null);
    setClientError(null);
    fileInputKeyRef.current += 1;
    setFileInputKey(fileInputKeyRef.current);
  });

  useActionStateSuccess(deleteState, isDeletePending, () => {
    setDeleteComplete(true);
  });

  useEffect(() => {
    if (!deleteComplete) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const removedId = deleteState.uploadId;
      if (removedId) {
        setUploads((current) => current.filter((row) => row.id !== removedId));
      }
      setPendingDelete(null);
      setDeleteComplete(false);
    }, 420);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [deleteComplete, deleteState.uploadId]);

  async function openFile(uploadId: string) {
    setOpeningId(uploadId);
    try {
      const result = await getStudentTaskUploadSignedUrlForSelfAction(uploadId);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      showErrorToast("Unable to open file.");
    } finally {
      setOpeningId(null);
    }
  }

  function handleFile(file: File) {
    if (!started || !studentTaskId || isUploadPending) {
      return;
    }
    if (uploads.length >= STUDENT_TASK_UPLOAD_MAX_FILES) {
      return;
    }
    setClientError(null);
    if (file.size > STUDENT_TASK_UPLOAD_MAX_BYTES) {
      setSelectedFileName(file.name);
      setClientError(
        `This file is ${formatUploadFileSize(file.size)}. Files must be under ${MAX_MB} MB.`
      );
      return;
    }
    setSelectedFileName(file.name);
    const formData = new FormData();
    formData.set("student_task_id", studentTaskId);
    formData.set("file", file);
    uploadAction(formData);
  }

  function onDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingDelete || deleteBusy) {
      return;
    }
    const formData = new FormData();
    formData.set("id", pendingDelete.id);
    deleteAction(formData);
  }

  if (!studentTaskId) {
    return (
      <p className="text-sm text-muted-foreground">
        This task is not assigned to you yet.
      </p>
    );
  }

  const atMaxFiles = uploads.length >= STUDENT_TASK_UPLOAD_MAX_FILES;
  const showUploadPane = started && !atMaxFiles;
  const fieldError = uploadState.error ?? null;
  const showUploadRow = isUploadPending && selectedFileName && !clientError;
  const showErrorRow = Boolean(clientError || fieldError) && selectedFileName;

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

      {uploads.length === 0 && !showUploadRow && !showErrorRow ? (
        <div className="flex h-full min-h-28 items-center justify-center px-4 py-5">
          <EmptyState
            size="sm"
            icon={FileIcon}
            title="No files yet"
            description={
              showUploadPane
                ? "Uploaded files will show here."
                : !started
                  ? "Uploads unlock when the task is started."
                  : `${STUDENT_TASK_UPLOAD_MAX_FILES} file limit reached.`
            }
          />
        </div>
      ) : (
        <ul>
          {uploads.map((upload, index) => {
            const isFirstVisible =
              index === 0 && !showUploadRow && !showErrorRow;
            return (
              <li key={upload.id}>
                <TaskFileListRow
                  fileName={upload.file_name}
                  mimeType={upload.mime_type}
                  meta={
                    <>
                      {formatUploadFileSize(upload.file_size)} ·{" "}
                      {format(new Date(upload.created_at), "MMM d, yyyy")}
                    </>
                  }
                  isOpening={openingId === upload.id}
                  canOpen
                  canDelete
                  onOpen={() => void openFile(upload.id)}
                  onDelete={() => {
                    setDeleteComplete(false);
                    setPendingDelete(upload);
                  }}
                  className={isFirstVisible ? "border-t-0" : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-[15px] font-medium tracking-tight">
              Your files
            </h3>
            <span className="inline-flex shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {uploads.length} of {STUDENT_TASK_UPLOAD_MAX_FILES}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {!started
              ? "Not started"
              : atMaxFiles
                ? "Limit reached"
                : "Required uploads"}
          </span>
        </div>

        {showUploadPane ? (
          <div className="relative grid @lg/panel:grid-cols-2">
            <div className="flex flex-col gap-3 border-b border-border/60 p-4 @lg/panel:border-r @lg/panel:border-b-0">
              <TaskFileDropzone
                key={fileInputKey}
                inputId={inputId}
                accept={STUDENT_TASK_UPLOAD_ACCEPT}
                disabled={isUploadPending || deleteBusy}
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
          <>
            {!started || atMaxFiles ? (
              <div className="border-b border-border/60 px-4 py-3">
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-center text-xs text-muted-foreground">
                  {!started
                    ? "You can upload files once this task is started."
                    : `${STUDENT_TASK_UPLOAD_MAX_FILES} file limit reached.`}
                </p>
              </div>
            ) : null}
            <div>{filesList}</div>
          </>
        )}
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!deleteBusy}>
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `Delete ${pendingDelete.file_name}? This removes it from your task.`
                : "Delete this file?"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onDeleteSubmit}>
            {deleteBusy ? (
              <div className="mb-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <InlineSpinner className="size-4" />
                  Deleting…
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(shownDeleteProgress)}
                    aria-label="Delete progress"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${Math.max(shownDeleteProgress, 8)}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                    {Math.round(shownDeleteProgress)}%
                  </span>
                </div>
              </div>
            ) : null}
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteOpenChange(false)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteBusy || !pendingDelete}
              >
                {deleteBusy ? <InlineSpinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
