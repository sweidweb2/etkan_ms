"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { addInstructorsAction } from "@/app/manager/instructors/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { InstructorUserMultiSelectField } from "@/components/manager/instructors/instructor-user-multi-select-field";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  AddInstructorsActionState,
  ManagerInstructorCandidateRow,
} from "@/types/manager-instructor";

const initialState: AddInstructorsActionState = {};

type AddInstructorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateUsers: ManagerInstructorCandidateRow[];
  onAdded: () => void;
};

export function AddInstructorsDialog({
  open,
  onOpenChange,
  candidateUsers,
  onAdded,
}: AddInstructorsDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    addInstructorsAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const [selected, setSelected] = useState<ManagerInstructorCandidateRow[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      setSelected([]);
      setSelectionError(null);
    }
    onOpenChange(nextOpen);
  });

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    handleOpenChange(false);
    onAdded();
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length === 0) {
      setSelectionError("Select at least one user.");
      return;
    }

    setSelectionError(null);
    const formData = new FormData();
    formData.set(
      "userIds",
      JSON.stringify(selected.map((user) => user.id))
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add instructors</DialogTitle>
          <DialogDescription>
            Search and select users to mark as instructors.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-instructors-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="instructor-user-multi-select"
              label="Users"
              hint="Type to search by username or email"
            />
            <InstructorUserMultiSelectField
              users={candidateUsers}
              selected={selected}
              onChange={(next) => {
                setSelected(next);
                if (next.length > 0) {
                  setSelectionError(null);
                }
              }}
              disabled={isPending}
              invalid={Boolean(selectionError)}
            />
            {selectionError ? (
              <p className="text-sm text-destructive">{selectionError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-instructors-form"
            disabled={isPending || selected.length === 0}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
