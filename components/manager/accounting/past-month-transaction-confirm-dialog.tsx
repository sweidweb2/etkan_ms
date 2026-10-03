"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PastMonthTransactionConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  disabled?: boolean;
};

export function PastMonthTransactionConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  disabled = false,
}: PastMonthTransactionConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!disabled}>
        <DialogHeader>
          <DialogTitle>Past month change</DialogTitle>
          <DialogDescription>
            This date is in a past month. Available money already copied into a
            later month will not be recalculated. Continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={disabled}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
