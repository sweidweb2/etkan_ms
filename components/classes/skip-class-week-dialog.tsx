"use client";

import { useRef } from "react";
import { skipClassWeekAction } from "@/app/manager/classes/actions";
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
import { Label } from "@/components/ui/label";
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { CLASS_SESSION_SKIP_REASON_MAX_LENGTH } from "@/lib/constants/class-session-skips";
import type { SkipClassWeekActionState } from "@/types/manager-class-week-skip";

const initialState: SkipClassWeekActionState = {};

export type SkipClassWeekTarget = {
  date: string;
  /** Set when skipping an already created (latest) session. */
  sessionId: string | null;
  label: string;
};

type SkipClassWeekDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  target: SkipClassWeekTarget;
  onSkipped: (state: SkipClassWeekActionState) => void;
};

export function SkipClassWeekDialog({
  open,
  onOpenChange,
  classId,
  target,
  onSkipped,
}: SkipClassWeekDialogProps) {
  const reasonRef = useRef<HTMLInputElement>(null);

  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: skipClassWeekAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (next) => {
        onSkipped(next);
        onOpenChange(false);
      },
    });

  function handleSubmit() {
    if (isPending) {
      return;
    }

    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("skip_date", target.date);
    formData.set("session_id", target.sessionId ?? "");
    formData.set("reason", reasonRef.current?.value.trim() ?? "");
    formAction(formData);
  }

  const reasonError = state.fieldErrors?.reason?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Skip {target.label}</DialogTitle>
          <DialogDescription>
            {target.sessionId
              ? "The session for this week will be removed and no session is held. The next session follows a week later."
              : "No session will be created for this week. The next session follows a week later."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="skip-week-reason">Reason (optional)</Label>
          <Input
            ref={reasonRef}
            id="skip-week-reason"
            maxLength={CLASS_SESSION_SKIP_REASON_MAX_LENGTH}
            placeholder="e.g. Public holiday"
            aria-invalid={!!reasonError}
            disabled={isPending}
          />
          {reasonError ? (
            <p className="text-sm text-destructive">{reasonError}</p>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Skip week
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
