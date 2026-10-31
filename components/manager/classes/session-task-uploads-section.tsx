"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { format } from "date-fns";
import { ExternalLinkIcon, Trash2Icon, UploadIcon, UsersIcon } from "lucide-react";
import {
  deleteStudentTaskUploadAction,
  getStudentTaskUploadSignedUrlAction,
  uploadStudentTaskFileAction,
} from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatUploadFileSize } from "@/lib/classes/student-task-upload-format";
import { showErrorToast } from "@/lib/toast";
import type {
  DeleteStudentTaskUploadActionState,
  ManagerStudentTaskRow,
  ManagerStudentTaskUploadRow,
  UploadStudentTaskFileActionState,
} from "@/types/manager-class-session-detail";

const initialUploadState: UploadStudentTaskFileActionState = {};
const initialDeleteState: DeleteStudentTaskUploadActionState = {};

type SessionTaskUploadsSectionProps = {
  studentTasks: ManagerStudentTaskRow[];
  initialUploads: ManagerStudentTaskUploadRow[];
  lockedUserIds?: string[];
};

export function SessionTaskUploadsSection({
  studentTasks,
  initialUploads,
  lockedUserIds = [],
}: SessionTaskUploadsSectionProps) {
  const [uploads, setUploads] = useState(initialUploads);
  const [prevUploads, setPrevUploads] = useState(initialUploads);
  const sortedStudents = useMemo(
    () =>
      [...studentTasks].sort((left, right) =>
        left.full_name.localeCompare(right.full_name)
      ),
    [studentTasks]
  );
  const studentSelectItems = useMemo(
    () =>
      Object.fromEntries(
        sortedStudents.map((student) => [student.id, student.full_name])
      ),
    [sortedStudents]
  );
  const [selectedStudentTaskId, setSelectedStudentTaskId] = useState<
    string | null
  >(sortedStudents[0]?.id ?? null);
  const lockedUserIdSet = useMemo(
    () => new Set(lockedUserIds),
    [lockedUserIds]
  );

  if (initialUploads !== prevUploads) {
    setPrevUploads(initialUploads);
    setUploads(initialUploads);
  }

  const selectedStudentTask =
    sortedStudents.find((row) => row.id === selectedStudentTaskId) ?? null;
  const selectedLocked = selectedStudentTask
    ? lockedUserIdSet.has(selectedStudentTask.student_id)
    : false;

  const selectedUploads = useMemo(
    () =>
      uploads.filter(
        (upload) => upload.student_task_id === selectedStudentTaskId
      ),
    [selectedStudentTaskId, uploads]
  );

  const atMaxFiles = selectedUploads.length >= STUDENT_TASK_UPLOAD_MAX_FILES;
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isSelectProgressActive, setIsSelectProgressActive] = useState(false);
  const [selectProgressComplete, setSelectProgressComplete] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const [uploadState, uploadAction, isUploadPending] = useFormActionState(
    uploadStudentTaskFileAction,
    initialUploadState
  );

  const selectProgress = useSimulatedProgressPercent(isSelectProgressActive);
  const uploadProgress = useSimulatedProgressPercent(
    isUploadPending && !uploadComplete
  );
  const shownSelectProgress = selectProgressComplete ? 100 : selectProgress;
  const shownUploadProgress = uploadComplete ? 100 : uploadProgress;
  const progressPercent = isUploadPending
    ? shownUploadProgress
    : selectedFileName
      ? shownSelectProgress
      : 0;
  const showProgress = Boolean(selectedFileName) || isUploadPending;

  function resetSelectedFile() {
    formRef.current?.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFileName(null);
    setIsSelectProgressActive(false);
    setSelectProgressComplete(false);
    setUploadComplete(false);
  }

  useActionStateToast(uploadState, isUploadPending);

  useEffect(() => {
    if (!isSelectProgressActive || selectProgress < 92) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsSelectProgressActive(false);
      setSelectProgressComplete(true);
    }, 180);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isSelectProgressActive, selectProgress]);

  useActionStateSuccess(uploadState, isUploadPending, (nextState) => {
    setUploadComplete(true);
    window.setTimeout(() => {
      if (nextState.upload) {
        setUploads((current) =>
          current.some((row) => row.id === nextState.upload!.id)
            ? current.map((row) =>
                row.id === nextState.upload!.id ? nextState.upload! : row
              )
            : [nextState.upload!, ...current]
        );
      }
      resetSelectedFile();
    }, 220);
  });

  const [deletingUpload, setDeletingUpload] =
    useState<ManagerStudentTaskUploadRow | null>(null);
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

  useActionStateToast(deleteState, isDeletePending);
  useActionStateSuccess(deleteState, isDeletePending, () => {
    if (deletingUpload) {
      setUploads((current) =>
        current.filter((row) => row.id !== deletingUpload.id)
      );
    }
    setDeletingUpload(null);
  });

  const [openingUploadId, setOpeningUploadId] = useState<string | null>(null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFileName(null);
      setIsSelectProgressActive(false);
      setSelectProgressComplete(false);
      return;
    }

    setSelectedFileName(file.name);
    setSelectProgressComplete(false);
    setIsSelectProgressActive(true);
    setUploadComplete(false);
  }

  function onUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !selectedStudentTaskId ||
      !selectedFileName ||
      selectedLocked ||
      atMaxFiles ||
      isUploadPending
    ) {
      return;
    }

    setUploadComplete(false);
    const formData = new FormData(event.currentTarget);
    formData.set("student_task_id", selectedStudentTaskId);
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

  async function handleOpenUpload(upload: ManagerStudentTaskUploadRow) {
    setOpeningUploadId(upload.id);
    try {
      const formData = new FormData();
      formData.set("id", upload.id);
      const result = await getStudentTaskUploadSignedUrlAction(formData);
      if (!result.success || !result.signedUrl) {
        showErrorToast(result.error ?? "Unable to open file.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningUploadId(null);
    }
  }

  const fileError = uploadState.fieldErrors?.file?.[0];
  const uploadDisabled =
    !selectedStudentTaskId ||
    selectedLocked ||
    atMaxFiles ||
    isUploadPending ||
    !selectedFileName;

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

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Student uploads</CardTitle>
          <p className="text-sm text-muted-foreground">
            Files attached to a student&apos;s task row (max{" "}
            {STUDENT_TASK_UPLOAD_MAX_FILES} per student).
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 py-4">
          {sortedStudents.length === 0 ? (
            <EmptyState
              size="sm"
              icon={UsersIcon}
              title="No student tasks yet"
              description="Uploads appear after students are seeded for this assignment."
            />
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:max-w-md">
                <FieldLabel
                  htmlFor="session-task-upload-student"
                  label="Student"
                  hint="Required"
                />
                <Select
                  value={selectedStudentTaskId}
                  items={studentSelectItems}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setSelectedStudentTaskId(value);
                    resetSelectedFile();
                  }}
                >
                  <SelectTrigger
                    id="session-task-upload-student"
                    className="w-full"
                  >
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {sortedStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLocked ? (
                <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100">
                  This student&apos;s task inputs are locked while a computed
                  course grade exists.
                </p>
              ) : null}

              <Can permission={PERMISSIONS.TASKS_UPDATE_STUDENT}>
                <form
                  ref={formRef}
                  className="flex flex-col gap-3 sm:max-w-md"
                  onSubmit={onUploadSubmit}
                  noValidate
                >
                  <div className="flex flex-col gap-2">
                    <FieldLabel
                      htmlFor="session-task-upload-file"
                      label="Upload file"
                      hint={
                        atMaxFiles
                          ? `Limit reached (${STUDENT_TASK_UPLOAD_MAX_FILES})`
                          : `Optional · max ${Math.round(STUDENT_TASK_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`
                      }
                    />
                    <Input
                      ref={fileInputRef}
                      id="session-task-upload-file"
                      name="file"
                      type="file"
                      accept={STUDENT_TASK_UPLOAD_ACCEPT}
                      disabled={
                        !selectedStudentTaskId ||
                        selectedLocked ||
                        atMaxFiles ||
                        isUploadPending
                      }
                      aria-invalid={Boolean(fileError)}
                      onChange={onFileChange}
                    />
                    {selectedFileName ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedFileName}
                      </p>
                    ) : null}
                    {showProgress ? (
                      <div className="flex flex-col gap-1.5">
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(progressPercent)}
                          aria-label={
                            isUploadPending
                              ? "Upload progress"
                              : "File selection progress"
                          }
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isUploadPending
                            ? `Uploading… ${Math.round(progressPercent)}%`
                            : selectProgressComplete
                              ? "Ready to upload"
                              : `Preparing… ${Math.round(progressPercent)}%`}
                        </p>
                      </div>
                    ) : null}
                    {fileError ? (
                      <p className="text-sm text-destructive">{fileError}</p>
                    ) : null}
                  </div>

                  {uploadState.error && !uploadState.fieldErrors ? (
                    <p className="text-sm text-destructive">
                      {uploadState.error}
                    </p>
                  ) : null}

                  <div>
                    <Button type="submit" disabled={uploadDisabled}>
                      {isUploadPending ? <InlineSpinner /> : null}
                      Save upload
                    </Button>
                  </div>
                </form>
              </Can>

              {selectedUploads.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={UploadIcon}
                  title="No uploads yet"
                  description="No uploads for this student yet."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">File</th>
                        <th className="pb-2 pr-3 font-medium">Size</th>
                        <th className="pb-2 pr-3 font-medium">Uploaded</th>
                        <th className="pb-2 font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUploads.map((upload) => (
                        <tr
                          key={upload.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="py-3 pr-3 align-middle font-medium">
                            {upload.file_name}
                          </td>
                          <td className="py-3 pr-3 align-middle text-muted-foreground">
                            {formatUploadFileSize(upload.file_size)}
                          </td>
                          <td className="py-3 pr-3 align-middle text-muted-foreground">
                            {format(
                              new Date(upload.created_at),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </td>
                          <td className="py-3 align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Open ${upload.file_name}`}
                                disabled={openingUploadId === upload.id}
                                onClick={() => handleOpenUpload(upload)}
                              >
                                {openingUploadId === upload.id ? (
                                  <InlineSpinner />
                                ) : (
                                  <ExternalLinkIcon />
                                )}
                              </Button>
                              <Can permission={PERMISSIONS.TASKS_UPDATE_STUDENT}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Delete ${upload.file_name}`}
                                  disabled={selectedLocked}
                                  onClick={() => setDeletingUpload(upload)}
                                >
                                  <Trash2Icon />
                                </Button>
                              </Can>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
