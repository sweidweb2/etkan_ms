"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { FieldLabel } from "@/components/auth/field-label";
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
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import {
  TASK_ATTACHMENT_ACCEPT,
  TASK_ATTACHMENT_MAX_BYTES,
  type TaskAttachmentEntity,
} from "@/lib/constants/task-attachments";
import type {
  TaskAttachmentRow,
  UploadTaskAttachmentActionState,
} from "@/types/task-attachment";

const initialState: UploadTaskAttachmentActionState = {};

type UploadTaskAttachmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: TaskAttachmentEntity;
  entityId: string;
  uploadAction: (
    prevState: UploadTaskAttachmentActionState,
    formData: FormData
  ) => Promise<UploadTaskAttachmentActionState>;
  onUploaded: (attachment: TaskAttachmentRow) => void;
};

export function UploadTaskAttachmentDialog({
  open,
  onOpenChange,
  entity,
  entityId,
  uploadAction,
  onUploaded,
}: UploadTaskAttachmentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    uploadAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isSelectProgressActive, setIsSelectProgressActive] = useState(false);
  const [selectProgressComplete, setSelectProgressComplete] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  function resetUploadForm() {
    formRef.current?.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFileName(null);
    setIsSelectProgressActive(false);
    setSelectProgressComplete(false);
    setUploadComplete(false);
  }

  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetUploadForm();
    }
  });

  const selectProgress = useSimulatedProgressPercent(isSelectProgressActive);
  const uploadProgress = useSimulatedProgressPercent(
    isPending && !uploadComplete
  );

  const shownSelectProgress = selectProgressComplete ? 100 : selectProgress;
  const shownUploadProgress = uploadComplete ? 100 : uploadProgress;
  const progressPercent = isPending
    ? shownUploadProgress
    : selectedFileName
      ? shownSelectProgress
      : 0;
  const showProgress = Boolean(selectedFileName) || isPending;

  useActionStateToast(state, isPending);

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

  useActionStateSuccess(state, isPending, (nextState) => {
    setUploadComplete(true);
    window.setTimeout(() => {
      onOpenChange(false);
      resetUploadForm();
      if (nextState.attachment) {
        onUploaded(nextState.attachment);
      }
    }, 220);
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("entity", entity);
    formData.set("entity_id", entityId);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Upload attachment</DialogTitle>
          <DialogDescription>
            Attach a file to this task (max{" "}
            {Math.round(TASK_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB).
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="task-attachment-file" label="File" hint="Required" />
            <Input
              id="task-attachment-file"
              ref={fileInputRef}
              name="file"
              type="file"
              accept={TASK_ATTACHMENT_ACCEPT}
              disabled={isPending}
              aria-invalid={Boolean(state.fieldErrors?.file?.[0])}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFileName(file?.name ?? null);
                setSelectProgressComplete(false);
                setIsSelectProgressActive(Boolean(file));
                setUploadComplete(false);
              }}
            />
            {state.fieldErrors?.file?.[0] ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.file[0]}
              </p>
            ) : null}
            {showProgress ? (
              <div className="flex flex-col gap-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPending
                    ? "Uploading…"
                    : selectedFileName
                      ? selectedFileName
                      : null}
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedFileName}>
              {isPending ? <InlineSpinner className="mr-2" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
