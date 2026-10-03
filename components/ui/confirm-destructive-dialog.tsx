"use client";

import type { ReactNode } from "react";
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

type ConfirmDestructiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  isPending: boolean;
  formAction: (formData: FormData) => void;
  /** Hidden inputs / extra form fields. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When false, the confirm submit control is disabled. */
  canConfirm?: boolean;
};

/**
 * Shared destructive confirm Dialog with pending-aware dismiss and form submit.
 */
export function ConfirmDestructiveDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  formAction,
  children,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  canConfirm = true,
}: ConfirmDestructiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {children}
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || !canConfirm}
            >
              {isPending ? <InlineSpinner /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
