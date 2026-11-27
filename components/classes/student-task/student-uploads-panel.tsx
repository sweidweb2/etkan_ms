"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { FileIcon } from "lucide-react";
import {
  deleteStudentTaskUploadAction,
  getStudentTaskUploadSignedUrlAction,
  uploadStudentTaskFileAction,
} from "@/app/manager/classes/actions";
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
import { usePermissions } from "@/components/auth/permissions-provider";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import { useTaskFileSignedUrl } from "@/hooks/use-task-file-signed-url";
import { useTaskFileUploadSelection } from "@/hooks/use-task-file-upload-selection";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { formatUploadFileSize } from "@/lib/classes/student-task-upload-format";
import {
  STUDENT_TASK_UPLOAD_ACCEPT,
  STUDENT_TASK_UPLOAD_MAX_BYTES,
  STUDENT_TASK_UPLOAD_MAX_FILES,
} from "@/lib/constants/manager-student-task-uploads";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type {
  DeleteStudentTaskUploadActionState,
  ManagerStudentTaskUploadRow,
  UploadStudentTaskFileActionState,
} from "@/types/manager-class-session-detail";

const initialUploadState: UploadStudentTaskFileActionState = {};
const initialDeleteState: DeleteStudentTaskUploadActionState = {};

export type StudentUploadsPanelProps = {
  studentTaskId: string;
  uploads: ManagerStudentTaskUploadRow[];
  locked: boolean;
  onUploadsChange: (
    updater: (current: ManagerStudentTaskUploadRow[]) => ManagerStudentTaskUploadRow[]
  ) => void;
};

export function StudentUploadsPanel({
  studentTaskId,
  uploads,
  locked,
  onUploadsChange,
}: StudentUploadsPanelProps) {
  const permissions = usePermissions();
  const canMutate = hasPermissionInSet(
    permissions,
    PERMISSIONS.TASKS_UPDATE_STUDENT
  );
  const inputId = useId();
  const {
    maxMb,
    fileInputKey,
    selectedFileName,
    clientError,
    resetSelection,
    beginFile,
  } = useTaskFileUploadSelection(STUDENT_TASK_UPLOAD_MAX_BYTES);
  const DROPZONE_HINT = `PDF, DOCX, XLSX, PNG, JPG · up to ${maxMb} MB each`;
  const { busy: busyUpload, runSignedUrlAction } = useTaskFileSignedUrl();
  const [deletingUpload, setDeletingUpload] =
    useState<ManagerStudentTaskUploadRow | null>(null);

  const [uploadState, uploadAction, isUploadPending] = useFormActionState(
    uploadStudentTaskFileAction,
    initialUploadState
  );
  const [deleteState, deleteAction, isDeletePending] = useFormActionState(
    deleteStudentTaskUploadAction,
    initialDeleteState
  );

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    (open) => {
      if (!open) {
        setDeletingUpload(null);
      }
    }
  );

  const uploadProgress = useSimulatedProgressPercent(isUploadPending);
  const atMaxFiles = uploads.length >= STUDENT_TASK_UPLOAD_MAX_FILES;
  const showDropzone = canMutate && !locked && !atMaxFiles;

  useActionStateToast(uploadState, isUploadPending);
  useActionStateToast(deleteState, isDeletePending);

  useActionStateSuccess(uploadState, isUploadPending, (nextState) => {
    if (nextState.upload) {
      onUploadsChange((current) =>
        current.some((row) => row.id === nextState.upload!.id)
          ? current.map((row) =>
              row.id === nextState.upload!.id ? nextState.upload! : row
            )
          : [nextState.upload!, ...current]
      );
    }
    resetSelection();
  });

  useActionStateSuccess(deleteState, isDeletePending, () => {
    if (deletingUpload) {
      onUploadsChange((current) =>
        current.filter((row) => row.id !== deletingUpload.id)
      );
    }
    setDeletingUpload(null);
  });

  function handleFile(file: File) {
    if (!canMutate || locked || atMaxFiles || isUploadPending) {
      return;
    }
    if (beginFile(file) === "too_large") {
      return;
    }
    const formData = new FormData();
    formData.set("student_task_id", studentTaskId);
    formData.set("file", file);
    uploadAction(formData);
  }

  function handleConfirmDelete() {
    if (!deletingUpload) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deletingUpload.id);
    deleteAction(formData);
  }

  function resolveUploadSignedUrl(uploadId: string) {
    const formData = new FormData();
    formData.set("id", uploadId);
    return getStudentTaskUploadSignedUrlAction(formData);
  }

  function handleOpenUpload(upload: ManagerStudentTaskUploadRow) {
    void runSignedUrlAction(upload.id, "open", () =>
      resolveUploadSignedUrl(upload.id)
    );
  }

  function handleDownloadUpload(upload: ManagerStudentTaskUploadRow) {
    void runSignedUrlAction(
      upload.id,
      "download",
      () => resolveUploadSignedUrl(upload.id),
      upload.file_name
    );
  }

  const fieldError = uploadState.fieldErrors?.file?.[0] ?? null;
  const showUploadRow = isUploadPending && selectedFileName && !clientError;
  const showErrorRow = Boolean(clientError || fieldError) && selectedFileName;

  return (
    <>
      <Dialog
        open={Boolean(deletingUpload)}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeletePending}
        >
          <DialogHeader>
            <DialogTitle>Delete upload</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              {deletingUpload?.file_name?.trim()
                ? deletingUpload.file_name
                : "this file"}{" "}
              from storage? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-[15px] font-medium tracking-tight">
              Student uploads
            </h3>
            <span className="inline-flex shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {uploads.length} of {STUDENT_TASK_UPLOAD_MAX_FILES}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {locked
              ? "Locked"
              : atMaxFiles
                ? "Limit reached"
                : canMutate
                  ? "Optional"
                  : null}
          </span>
        </div>

        {showDropzone ? (
          <div className="px-4 pt-1 pb-3.5">
            <TaskFileDropzone
              key={fileInputKey}
              inputId={inputId}
              accept={STUDENT_TASK_UPLOAD_ACCEPT}
              disabled={isUploadPending || isDeletePending}
              hint={DROPZONE_HINT}
              onFile={handleFile}
            />
          </div>
        ) : canMutate ? (
          <div className="px-4 pb-3">
            <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-center text-xs text-muted-foreground">
              {locked
                ? "Uploads are locked for this student."
                : `${STUDENT_TASK_UPLOAD_MAX_FILES} file limit reached.`}
            </p>
          </div>
        ) : null}

        {showUploadRow ? (
          <TaskFileListRow
            fileName={selectedFileName!}
            isUploading
            uploadProgress={uploadProgress}
          />
        ) : null}

        {showErrorRow ? (
          <TaskFileListRow
            fileName={selectedFileName!}
            errorMessage={clientError ?? fieldError}
            onDismissError={resetSelection}
            className="rounded-b-xl"
          />
        ) : null}

        {uploads.length === 0 && !showUploadRow && !showErrorRow ? (
          <div className="px-4 py-5">
            <EmptyState
              size="sm"
              icon={FileIcon}
              title="No uploads yet"
              description={
                showDropzone
                  ? "Drag a file into the zone above or browse to attach."
                  : "No files uploaded for this student yet."
              }
            />
          </div>
        ) : (
          <ul>
            {uploads.map((upload, index) => {
              const isLast =
                index === uploads.length - 1 && !showErrorRow && !showUploadRow;
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
                    isOpening={
                      busyUpload?.id === upload.id && busyUpload.mode === "open"
                    }
                    isDownloading={
                      busyUpload?.id === upload.id &&
                      busyUpload.mode === "download"
                    }
                    canOpen
                    canDownload
                    canDelete={canMutate && !locked}
                    onOpen={() => void handleOpenUpload(upload)}
                    onDownload={() => void handleDownloadUpload(upload)}
                    onDelete={() => setDeletingUpload(upload)}
                    className={isLast ? "rounded-b-xl" : undefined}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
