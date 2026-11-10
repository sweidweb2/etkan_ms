"use client";

import { useEffect, useMemo, useState } from "react";
import { assignSubjectsToStageAction } from "@/app/manager/subjects/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import type {
  AssignSubjectsToStageActionState,
  ManagerStageRow,
} from "@/types/manager-stage";
import type { ManagerSubjectRow } from "@/types/manager-subject";

const initialState: AssignSubjectsToStageActionState = {};

type AssignSubjectsToStageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: ManagerStageRow[];
  subjects: ManagerSubjectRow[];
  onAssigned: (subjectIds: string[], stageId: string | null) => void;
};

export function AssignSubjectsToStageDialog({
  open,
  onOpenChange,
  stages,
  subjects,
  onAssigned,
}: AssignSubjectsToStageDialogProps) {
  const [stageValue, setStageValue] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: assignSubjectsToStageAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        onOpenChange(false);
        if (nextState.subjectIds) {
          onAssigned(nextState.subjectIds, nextState.stageId ?? null);
        }
      },
    });

  useEffect(() => {
    if (!open) {
      setStageValue("");
      setSelectedIds(new Set());
    }
  }, [open]);

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [subjects]
  );

  const selectedCount = selectedIds.size;
  const stageError = state.fieldErrors?.stage_id?.[0];
  const subjectsError = state.fieldErrors?.subject_ids?.[0];

  function toggleSubject(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stageValue || selectedCount === 0) {
      return;
    }

    const formData = new FormData();
    formData.set("stage_id", stageValue);
    for (const id of selectedIds) {
      formData.append("subject_ids", id);
    }
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add subjects to stage</DialogTitle>
          <DialogDescription>
            Pick a stage and the subjects that should belong to it.
          </DialogDescription>
        </DialogHeader>

        <form
          id="assign-subjects-to-stage-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="assign-subjects-stage"
              label="Stage"
              hint="Required"
            />
            <Select
              value={stageValue || null}
              onValueChange={(value) => {
                if (value) {
                  setStageValue(value);
                }
              }}
              disabled={isPending || stages.length === 0}
            >
              <SelectTrigger
                id="assign-subjects-stage"
                aria-invalid={!!stageError}
                className="w-full"
              >
                <SelectValue placeholder="Select a stage">
                  {(value) =>
                    !value
                      ? "Select a stage"
                      : (stages.find((stage) => stage.id === value)?.name ??
                        "Select a stage")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name} · L{stage.level} · P{stage.period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a stage before assigning subjects.
              </p>
            ) : null}
            {stageError ? (
              <p className="text-sm text-destructive">{stageError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel label="Subjects" hint="Select one or more" />
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              {sortedSubjects.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  No subjects available.
                </p>
              ) : (
                <ul className="divide-y">
                  {sortedSubjects.map((subject) => {
                    const checked = selectedIds.has(subject.id);
                    const checkboxId = `assign-subject-${subject.id}`;
                    return (
                      <li key={subject.id}>
                        <label
                          htmlFor={checkboxId}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            disabled={isPending}
                            onCheckedChange={(next) =>
                              toggleSubject(subject.id, next)
                            }
                            aria-label={`Select ${subject.name}`}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {subject.name}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {subjectsError ? (
              <p className="text-sm text-destructive">{subjectsError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
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
            form="assign-subjects-to-stage-form"
            disabled={
              isPending ||
              stages.length === 0 ||
              !stageValue ||
              selectedCount === 0
            }
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving…
              </>
            ) : selectedCount > 0 ? (
              `Assign ${selectedCount}`
            ) : (
              "Assign subjects"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
