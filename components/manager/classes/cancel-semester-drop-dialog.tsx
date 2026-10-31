"use client";

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
  onCancelled: () => void;
};

export function CancelSemesterDropDialog({
  open,
  onOpenChange,
  classId,
  student,
  onCancelled,
}: CancelSemesterDropDialogProps) {
  const router = useRouter();
  const { formAction, isPending, handleOpenChange } = useMutationDialogForm({
    action: cancelSemesterDropAction,
    initialState,
    open,
    onOpenChange,
    onSuccess: () => {
      onCancelled();
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Stop semester drop</DialogTitle>
            <DialogDescription>
              Cancel the pending drop for {student?.full_name ?? "this student"}?
              They remain in the class with no drop badge.
            </DialogDescription>
          </DialogHeader>

          <input
            type="hidden"
            name="request_id"
            value={student?.pending_drop_request_id ?? ""}
          />
          <input type="hidden" name="class_id" value={classId} />

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Keep pending
            </Button>
            <Button type="submit" disabled={isPending || !student}>
              {isPending ? <InlineSpinner /> : null}
              Stop drop
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
