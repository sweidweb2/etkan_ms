"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { uploadWorkshopDocumentAction } from "@/app/manager/workshops/actions";
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
  WORKSHOP_DOCUMENT_ACCEPT,
  WORKSHOP_DOCUMENT_MAX_BYTES,
} from "@/lib/constants/manager-workshop-documents";
import type {
  ManagerWorkshopDocumentRow,
  UploadWorkshopDocumentActionState,
} from "@/types/manager-workshop";

const initialState: UploadWorkshopDocumentActionState = {};

type UploadWorkshopDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  onUploaded: (document: ManagerWorkshopDocumentRow) => void;
};

export function UploadWorkshopDocumentDialog({
  open,
  onOpenChange,
  workshopId,
  onUploaded,
}: UploadWorkshopDocumentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    uploadWorkshopDocumentAction,
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
  const uploadProgress = useSimulatedProgressPercent(isPending && !uploadComplete);

  const shownSelectProgress = selectProgressComplete
    ? 100
    : selectProgress;
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
      if (nextState.document) {
        onUploaded(nextState.document);
      }
    }, 220);
  });

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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadComplete(false);
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  }

  const fileError = state.fieldErrors?.file?.[0];
  const nameError = state.fieldErrors?.name?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Upload a PDF, image, or Office file (max{" "}
            {Math.round(WORKSHOP_DOCUMENT_MAX_BYTES / (1024 * 1024))} MB).
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          className="flex flex-col gap-4"
          onSubmit={onSubmit}
          noValidate
        >
          <input type="hidden" name="workshop_id" value={workshopId} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="workshop-document-file"
              label="File"
              hint="Required"
            />
            <Input
              id="workshop-document-file"
              ref={fileInputRef}
              name="file"
              type="file"
              accept={WORKSHOP_DOCUMENT_ACCEPT}
              disabled={isPending}
              aria-invalid={Boolean(fileError)}
              required
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
                    isPending ? "Upload progress" : "File selection progress"
                  }
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPending
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

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="workshop-document-name"
              label="Display name"
              hint="Optional"
            />
            <Input
              id="workshop-document-name"
              name="name"
              disabled={isPending}
              aria-invalid={Boolean(nameError)}
              placeholder="Defaults to file name"
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          {state.error && !state.fieldErrors ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedFileName}>
              {isPending ? <InlineSpinner /> : null}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
