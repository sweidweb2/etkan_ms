"use client";

import { removeStudentFromClassAction } from "@/app/manager/classes/actions";
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
import type { RemoveStudentFromClassActionState } from "@/types/manager-class-detail";

const initialState: RemoveStudentFromClassActionState = {};

type DropStudentRemoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membershipId: string;
  classId: string;
  className: string;
  studentName: string;
  onCompleted: () => void;
};

export function DropStudentRemoveDialog({
  open,
  onOpenChange,
  membershipId,
  classId,
  className,
  studentName,
  onCompleted,
}: DropStudentRemoveDialogProps) {
  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: removeStudentFromClassAction,
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
    formData.set("id", membershipId);
    formData.set("class_id", classId);
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Remove from class</DialogTitle>
          <DialogDescription>
            Remove {studentName} from {className}? Only this membership is
            removed. If it is the last class in the semester with an unpaid open
            SPP, that SPP is deleted.
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
