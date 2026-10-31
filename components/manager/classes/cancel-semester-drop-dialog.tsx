"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
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
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

type CancelSemesterDropActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const initialState: CancelSemesterDropActionState = {};

type CancelSemesterDropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  student: ManagerClassStudentRow | null;
  onCancelled: (membershipId: string) => void;
};

export function CancelSemesterDropDialog({
  open,
  onOpenChange,
  classId,
  student,
  onCancelled,
}: CancelSemesterDropDialogProps) {
  const router = useRouter();
  const submittedMembershipIdRef = useRef<string | null>(null);

  const { formAction, isPending, handleOpenChange, state } =
    useMutationDialogForm({
      action: cancelSemesterDropAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: () => {
        const membershipId = submittedMembershipIdRef.current;
        if (membershipId) {
          onCancelled(membershipId);
        }
        onOpenChange(false);
        router.refresh();
      },
    });

  function handleConfirm() {
    if (!student?.pending_drop_request_id || isPending) {
      return;
    }
    submittedMembershipIdRef.current = student.id;
    const formData = new FormData();
    formData.set("request_id", student.pending_drop_request_id);
    formData.set("class_id", classId);
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Stop semester drop</DialogTitle>
          <DialogDescription>
            Cancel the pending drop for {student?.full_name ?? "this student"}?
            They remain in the class with no drop badge.
          </DialogDescription>
        </DialogHeader>

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Keep pending
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !student?.pending_drop_request_id}
          >
            {isPending ? <InlineSpinner /> : null}
            Stop drop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
