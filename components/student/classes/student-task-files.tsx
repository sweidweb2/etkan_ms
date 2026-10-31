"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { format } from "date-fns";
import {
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
  Trash2Icon,
} from "lucide-react";
import {
  deleteStudentTaskUploadForSelfAction,
  getStudentTaskUploadSignedUrlForSelfAction,
  uploadStudentTaskFileForSelfAction,
} from "@/app/(panels)/student/classes/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
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
import {
  STUDENT_TASK_UPLOAD_ACCEPT,
  STUDENT_TASK_UPLOAD_MAX_BYTES,
  STUDENT_TASK_UPLOAD_MAX_FILES,
} from "@/lib/constants/manager-student-task-uploads";
import { showErrorToast } from "@/lib/toast";
import type {
  DeleteStudentTaskUploadActionState,
  StudentTaskUploadActionState,
  StudentTaskUploadForSelf,
} from "@/types/student-class";

const initialUploadState: StudentTaskUploadActionState = {};
const initialDeleteState: DeleteStudentTaskUploadActionState = {};

type StudentTaskFilesProps = {
  studentTaskId: string | null;
  uploads: StudentTaskUploadForSelf[];
  /** Uploads are only allowed once the class task has been started. */
  started?: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentTaskFiles({
  studentTaskId,
  uploads: initialUploads = [],
  started = true,
}: StudentTaskFilesProps) {
  const [uploads, setUploads] = useState(initialUploads);
  const [prevUploads, setPrevUploads] = useState(initialUploads);
  const [pendingDelete, setPendingDelete] =
    useState<StudentTaskUploadForSelf | null>(null);
  const [deleteComplete, setDeleteComplete] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  function rejectOversizedFile(file: File) {
    if (file.size <= STUDENT_TASK_UPLOAD_MAX_BYTES) {
      return false;
    }
    showErrorToast("File must be at most 10 MB.");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    return true;
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (rejectOversizedFile(file)) {
      return;
    }
    setSelectedFile(file);
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!started || !studentTaskId || !selectedFile || isUploadPending) {
      return;
    }
    if (rejectOversizedFile(selectedFile)) {
      return;
    }
    const formData = new FormData();
    formData.set("student_task_id", studentTaskId);
    formData.set("file", selectedFile);
    uploadAction(formData);
  }

  if (!studentTaskId) {
    return (
      <p className="text-sm text-muted-foreground">
        This task is not assigned to you yet.
      </p>
    );
  }

  const atMaxFiles = uploads.length >= STUDENT_TASK_UPLOAD_MAX_FILES;
  const uploadsBlocked = !started || atMaxFiles;
  const canSave =
    started && Boolean(selectedFile) && !isUploadPending && !atMaxFiles;

  return (
    <div className="overflow-hidden rounded-lg border">
      <input
        ref={fileInputRef}
        type="file"
        name="file"
        accept={STUDENT_TASK_UPLOAD_ACCEPT}
        className="sr-only"
        disabled={isUploadPending || uploadsBlocked}
        onChange={onFileChange}
      />

      <div className="grid border-b sm:grid-cols-[11rem_1fr]">
        <div className="border-b bg-muted/40 px-3 py-3 text-sm font-medium sm:border-r sm:border-b-0">
          Choose file
        </div>
        <div className="flex flex-col items-start gap-2 px-3 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadPending || uploadsBlocked}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? "Change file" : "Choose file"}
          </Button>
          <p className="text-xs text-muted-foreground">
            PDF, images, text, Word, Excel, or PowerPoint. Up to{" "}
            {formatFileSize(STUDENT_TASK_UPLOAD_MAX_BYTES)}.
          </p>
          {!started ? (
            <p className="text-xs text-muted-foreground">
              Not started yet. You can upload files once this task is started.
            </p>
          ) : null}
          {started && atMaxFiles ? (
            <p className="text-xs text-muted-foreground">
              {STUDENT_TASK_UPLOAD_MAX_FILES} file limit reached.
            </p>
          ) : null}
        </div>
      </div>

      {selectedFile ? (
      <div className="grid border-b sm:grid-cols-[11rem_1fr]">
        <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium sm:border-r sm:border-b-0">
          Chosen file
        </div>
        <div className="px-3 py-2">
            <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-2">
              <div className="flex items-start gap-2">
                <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              {isUploadPending ? (
                <div className="flex items-center gap-2">
                  <InlineSpinner className="size-3.5" />
                  <div
                    className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(uploadProgress)}
                    aria-label="Upload progress"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
              ) : null}
              <Button type="submit" size="sm" disabled={!canSave} className="self-start">
                {isUploadPending ? <InlineSpinner className="size-3.5" /> : null}
                Save
              </Button>
            </form>
        </div>
      </div>
      ) : null}

      <div className="grid sm:grid-cols-[11rem_1fr]">
        <div className="flex items-start justify-between gap-2 border-b bg-muted/40 px-3 py-3 text-sm font-medium sm:block sm:border-r sm:border-b-0">
          <span>Uploaded files</span>
          <span className="text-xs font-normal text-muted-foreground tabular-nums sm:mt-1 sm:block">
            {uploads.length}/{STUDENT_TASK_UPLOAD_MAX_FILES}
          </span>
        </div>
        <div className="px-3 py-3">
          {uploads.length === 0 ? (
            <EmptyState
              size="sm"
              icon={FileIcon}
              title="No files yet"
              description="Upload a file to attach it to this task."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="flex flex-col gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-start gap-2">
                    <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {upload.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(upload.file_size)}
                        {" · "}
                        {format(new Date(upload.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={openingId === upload.id}
                      onClick={() => openFile(upload.id)}
                    >
                      {openingId === upload.id ? (
                        <InlineSpinner className="size-3" />
                      ) : (
                        <ExternalLinkIcon />
                      )}
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setDeleteComplete(false);
                        setPendingDelete(upload);
                      }}
                    >
                      <Trash2Icon />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
    </div>
  );
}
