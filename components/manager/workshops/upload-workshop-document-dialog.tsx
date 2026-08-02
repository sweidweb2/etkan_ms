"use client";

import { useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";
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
import {
  WORKSHOP_DOCUMENT_ACCEPT,
  WORKSHOP_DOCUMENT_MAX_BYTES,
} from "@/lib/constants/manager-workshop-documents";
import type { UploadWorkshopDocumentActionState } from "@/types/manager-workshop";

const initialState: UploadWorkshopDocumentActionState = {};

type UploadWorkshopDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  onUploaded: () => void;
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
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useActionStateToast(state, isPending);

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onUploaded();
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            />
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
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
