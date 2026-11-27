"use client";

import { cancelSemesterDropAction } from "@/app/manager/classes/actions";
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
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import type { CancelSemesterDropActionState } from "@/types/manager-semester-drop";

const initialState: CancelSemesterDropActionState = {};

type DropStudentStopPendingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  classId: string;
  semesterName: string;
  onCompleted: () => void;
};

export function DropStudentStopPendingDialog({
  open,
  onOpenChange,
  requestId,
  classId,
  semesterName,
  onCompleted,
}: DropStudentStopPendingDialogProps) {
  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: cancelSemesterDropAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: () => {
        onCompleted();
        onOpenChange(false);
      },
    });

  function handleConfirm() {
    if (isPending) return;
    const formData = new FormData();
    formData.set("request_id", requestId);
    formData.set("class_id", classId);
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Stop pending drop</DialogTitle>
          <DialogDescription>
            Cancel the pending drop for {semesterName || "this semester"}? They
            remain in class with no drop badge.
          </DialogDescription>
        </DialogHeader>
        {state.error ? (
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
          <Button type="button" onClick={handleConfirm} disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Stop drop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
