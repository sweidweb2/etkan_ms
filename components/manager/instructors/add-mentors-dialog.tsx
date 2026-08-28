"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import {
  addMentorsAction,
  loadMentorCandidatesAction,
} from "@/app/manager/instructors/actions";
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
  AddMentorsActionState,
  ManagerMentorCandidateRow,
  ManagerMentorRow,
} from "@/types/manager-mentor";

const initialState: AddMentorsActionState = {};

type AddMentorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (mentors: ManagerMentorRow[]) => void;
};

export function AddMentorsDialog({
  open,
  onOpenChange,
  onAdded,
}: AddMentorsDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    addMentorsAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const [selected, setSelected] = useState<ManagerMentorCandidateRow[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<
    ManagerMentorCandidateRow[] | null
  >(null);

  const isLoadingOptions = open && candidates === null;

  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      setSelected([]);
      setSelectionError(null);
      setCandidates(null);
    }
    onOpenChange(nextOpen);
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    void loadMentorCandidatesAction().then((rows) => {
      if (!cancelled) {
        setCandidates(rows);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    const added = selected.map((user): ManagerMentorRow => ({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      created_at: new Date().toISOString(),
    }));
    handleOpenChange(false);
    if (added.length > 0) {
      onAdded(added);
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length === 0) {
      setSelectionError("Select at least one user.");
      return;
    }

    setSelectionError(null);
    const formData = new FormData();
    formData.set("userIds", JSON.stringify(selected.map((user) => user.id)));

    startTransition(() => {
      formAction(formData);
    });
  }

  const candidateUsers = candidates ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add mentors</DialogTitle>
          <DialogDescription>
            Search and select users to mark as mentors.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-mentors-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="mentor-user-multi-select"
              label="Users"
              hint="Type to search by username or email"
            />
            {isLoadingOptions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InlineSpinner />
                Loading users…
              </div>
            ) : (
              <InstructorUserMultiSelectField
                inputId="mentor-user-multi-select"
                emptyMessage="All users are already mentors."
                users={candidateUsers}
                selected={selected}
                onChange={(next) => {
                  setSelected(next);
                  if (next.length > 0) {
                    setSelectionError(null);
                  }
                }}
                disabled={isPending || candidateUsers.length === 0}
                invalid={Boolean(selectionError)}
              />
            )}
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
            form="add-mentors-form"
            disabled={isPending || isLoadingOptions || selected.length === 0}
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
