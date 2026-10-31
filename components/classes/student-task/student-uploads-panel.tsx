"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import {
  deleteStudentTaskUploadAction,
  getStudentTaskUploadSignedUrlAction,
  uploadStudentTaskFileAction,
} from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileTypeLogo } from "@/components/ui/file-type-logo";
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
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import {
  STUDENT_TASK_UPLOAD_ACCEPT,
  STUDENT_TASK_UPLOAD_MAX_BYTES,
  STUDENT_TASK_UPLOAD_MAX_FILES,
} from "@/lib/constants/manager-student-task-uploads";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  formatUploadFileSize,
  getStudentTaskUploadFormat,
} from "@/lib/classes/student-task-upload-format";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
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

const UPLOAD_CARD_SIZE = "h-[9.25rem] w-[8.5rem]";

export function StudentUploadsPanel({
  studentTaskId,
  uploads,
  locked,
  onUploadsChange,
}: StudentUploadsPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [busyUpload, setBusyUpload] = useState<{
    id: string;
    mode: "open" | "download";
  } | null>(null);
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

  function resetSelectedFile() {
    formRef.current?.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFileName(null);
    setUploadComplete(false);
  }

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    (open) => {
      if (!open) {
        setDeletingUpload(null);
      }
    }
  );
  const handleUploadFormOpenChange = usePendingAwareOpenChange(
    isUploadPending,
    (open) => {
      setIsUploadFormOpen(open);
      if (!open) {
        resetSelectedFile();
      }
    }
  );

  const uploadProgress = useSimulatedProgressPercent(
    isUploadPending && !uploadComplete
  );
  const progressPercent = uploadComplete ? 100 : uploadProgress;
  const atMaxFiles = uploads.length >= STUDENT_TASK_UPLOAD_MAX_FILES;

  useEffect(() => {
    // Reset picker when switching students.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local upload UI on student change
    setIsUploadFormOpen(false);
    resetSelectedFile();
  }, [studentTaskId]);

  useActionStateToast(uploadState, isUploadPending);
  useActionStateToast(deleteState, isDeletePending);

  useActionStateSuccess(uploadState, isUploadPending, (nextState) => {
    setUploadComplete(true);
    window.setTimeout(() => {
      if (nextState.upload) {
        onUploadsChange((current) =>
          current.some((row) => row.id === nextState.upload!.id)
            ? current.map((row) =>
                row.id === nextState.upload!.id ? nextState.upload! : row
              )
            : [nextState.upload!, ...current]
        );
      }
      resetSelectedFile();
      setIsUploadFormOpen(false);
    }, 220);
  });

  useActionStateSuccess(deleteState, isDeletePending, () => {
    if (deletingUpload) {
      onUploadsChange((current) =>
        current.filter((row) => row.id !== deletingUpload.id)
      );
    }
    setDeletingUpload(null);
  });

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFileName(file?.name ?? null);
    setUploadComplete(false);
  }

  function onUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFileName || locked || atMaxFiles || isUploadPending) {
      return;
    }

    setUploadComplete(false);
    const formData = new FormData(event.currentTarget);
    formData.set("student_task_id", studentTaskId);
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

  async function resolveUploadSignedUrl(uploadId: string) {
    const formData = new FormData();
    formData.set("id", uploadId);
    return getStudentTaskUploadSignedUrlAction(formData);
  }

  async function handleOpenUpload(upload: ManagerStudentTaskUploadRow) {
    setBusyUpload({ id: upload.id, mode: "open" });
    try {
      const result = await resolveUploadSignedUrl(upload.id);
      if (!result.success || !result.signedUrl) {
        showErrorToast(result.error ?? "Unable to open file.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setBusyUpload(null);
    }
  }

  async function handleDownloadUpload(upload: ManagerStudentTaskUploadRow) {
    setBusyUpload({ id: upload.id, mode: "download" });
    try {
      const result = await resolveUploadSignedUrl(upload.id);
      if (!result.success || !result.signedUrl) {
        showErrorToast(result.error ?? "Unable to download file.");
        return;
      }

      const response = await fetch(result.signedUrl);
      if (!response.ok) {
        showErrorToast("Unable to download file.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = upload.file_name || "download";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      showErrorToast("Unable to download file.");
    } finally {
      setBusyUpload(null);
    }
  }

  const fileError = uploadState.fieldErrors?.file?.[0];
  const uploadDisabled =
    locked || atMaxFiles || isUploadPending || !selectedFileName;

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

      <Dialog open={isUploadFormOpen} onOpenChange={handleUploadFormOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isUploadPending}
        >
          <DialogHeader>
            <DialogTitle>Upload file</DialogTitle>
            <DialogDescription>
              Attach a file to this student&apos;s task (max{" "}
              {Math.round(STUDENT_TASK_UPLOAD_MAX_BYTES / (1024 * 1024))} MB).
            </DialogDescription>
          </DialogHeader>

          <form
            ref={formRef}
            className="flex flex-col gap-3"
            onSubmit={onUploadSubmit}
            noValidate
          >
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor={`student-task-upload-${studentTaskId}`}
                label="File"
                hint={
                  atMaxFiles
                    ? `Limit reached (${STUDENT_TASK_UPLOAD_MAX_FILES})`
                    : "Required"
                }
              />
              <Input
                ref={fileInputRef}
                id={`student-task-upload-${studentTaskId}`}
                name="file"
                type="file"
                accept={STUDENT_TASK_UPLOAD_ACCEPT}
                disabled={locked || atMaxFiles || isUploadPending}
                aria-invalid={Boolean(fileError)}
                onChange={onFileChange}
              />
              {selectedFileName ? (
                <p className="truncate text-xs text-muted-foreground">
                  {selectedFileName}
                </p>
              ) : null}
              {isUploadPending || uploadComplete ? (
                <div className="flex flex-col gap-1.5">
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progressPercent)}
                    aria-label="Upload progress"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploadingâ€¦ {Math.round(progressPercent)}%
                  </p>
                </div>
              ) : null}
              {fileError ? (
                <p className="text-sm text-destructive">{fileError}</p>
              ) : null}
            </div>

            {uploadState.error && !uploadState.fieldErrors ? (
              <p className="text-sm text-destructive">{uploadState.error}</p>
            ) : null}

            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isUploadPending}
                onClick={() => handleUploadFormOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadDisabled}>
                {isUploadPending ? (
                  <InlineSpinner />
                ) : (
                  <UploadIcon data-icon="inline-start" />
                )}
                Save upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">Uploads</h3>
          <p className="text-xs text-muted-foreground">
            Max {STUDENT_TASK_UPLOAD_MAX_FILES} files Â·{" "}
            {Math.round(STUDENT_TASK_UPLOAD_MAX_BYTES / (1024 * 1024))} MB each
          </p>
        </div>

        <ul className="flex flex-wrap gap-2.5">
          {uploads.map((upload) => {
            const formatMeta = getStudentTaskUploadFormat(
              upload.mime_type,
              upload.file_name
            );
            return (
              <li key={upload.id}>
                <div
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border p-2.5 transition-colors",
                    UPLOAD_CARD_SIZE,
                    formatMeta.className
                  )}
                >
                  <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="size-6 bg-background/95 shadow-sm"
                      aria-label={`Open ${upload.file_name}`}
                      disabled={busyUpload?.id === upload.id}
                      onClick={() => handleOpenUpload(upload)}
                    >
                      {busyUpload?.id === upload.id &&
                      busyUpload.mode === "open" ? (
                        <InlineSpinner />
                      ) : (
                        <ExternalLinkIcon className="size-3" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="size-6 bg-background/95 shadow-sm"
                      aria-label={`Download ${upload.file_name}`}
                      disabled={busyUpload?.id === upload.id}
                      onClick={() => handleDownloadUpload(upload)}
                    >
                      {busyUpload?.id === upload.id &&
                      busyUpload.mode === "download" ? (
                        <InlineSpinner />
                      ) : (
                        <DownloadIcon className="size-3" />
                      )}
                    </Button>
                    <Can permission={PERMISSIONS.TASKS_UPDATE_STUDENT}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="size-6 bg-background/95 shadow-sm"
                        aria-label={`Delete ${upload.file_name}`}
                        disabled={locked || busyUpload?.id === upload.id}
                        onClick={() => setDeletingUpload(upload)}
                      >
                        <Trash2Icon className="size-3 text-destructive" />
                      </Button>
                    </Can>
                  </div>

                  <span className="pr-16 text-[11px] font-semibold tracking-wide">
                    {formatMeta.label}
                  </span>

                  <div className="flex min-h-0 flex-1 items-center justify-center py-1">
                    <FileTypeLogo
                      kind={formatMeta.kind}
                      label={formatMeta.label}
                      className="size-14"
                    />
                  </div>

                  <p className="truncate text-[10px] font-medium leading-tight text-foreground">
                    {upload.file_name}
                  </p>
                  <p className="truncate text-[10px] text-foreground/70">
                    {formatUploadFileSize(upload.file_size)}
                  </p>
                </div>
              </li>
            );
          })}

          <Can permission={PERMISSIONS.TASKS_UPDATE_STUDENT}>
            <li>
              <button
                type="button"
                disabled={locked || atMaxFiles}
                aria-label={
                  atMaxFiles
                    ? `Upload limit reached (${STUDENT_TASK_UPLOAD_MAX_FILES})`
                    : "Add upload"
                }
                title={
                  atMaxFiles
                    ? `Limit reached (${STUDENT_TASK_UPLOAD_MAX_FILES})`
                    : locked
                      ? "Uploads locked for this student"
                      : "Add upload"
                }
                onClick={() => handleUploadFormOpenChange(true)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground transition-colors",
                  UPLOAD_CARD_SIZE,
                  locked || atMaxFiles
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
                )}
              >
                <PlusIcon className="size-8" aria-hidden />
                <span className="text-xs font-medium">Add</span>
              </button>
            </li>
          </Can>
        </ul>

        {uploads.length === 0 ? (
          <EmptyState
            size="sm"
            icon={FileIcon}
            title="No uploads yet"
            description="Use Add to attach a file."
          />
        ) : null}
      </div>
    </>
  );
}
