"use client";

import { deleteAuditLogsAction } from "@/app/manager/logs/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type { DeleteAuditLogsActionState } from "@/types/manager-audit-log";

const initialState: DeleteAuditLogsActionState = {};

type DeleteLogsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logIds: string[];
  onDeleted: (deletedIds: string[]) => void;
};

export function DeleteLogsDialog({
  open,
  onOpenChange,
  logIds,
  onDeleted,
}: DeleteLogsDialogProps) {
  const [state, formAction, isPending] = useFormActionState(
    deleteAuditLogsAction,
    initialState
  );
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    onDeleted(nextState.deleted_ids ?? []);
  });

  const count = logIds.length;

  function handleConfirm() {
    const formData = new FormData();
    logIds.forEach((id) => formData.append("ids", id));
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {count === 1 ? "Delete log" : `Delete ${count} logs`}
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Permanently delete the selected audit log?"
              : `Permanently delete the ${count} selected audit logs?`}{" "}
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
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
            disabled={isPending || count === 0}
          >
            {isPending ? <InlineSpinner /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
