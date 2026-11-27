"use client";

import { useMemo, useState } from "react";
import { assignSemestersToTeamAction } from "@/app/manager/semesters/actions";
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
import type { ManagerSemesterRow } from "@/types/manager-phase";
import type {
  AssignSemestersToTeamActionState,
  ManagerSemesterTeamRow,
} from "@/types/manager-semester-team";

const initialState: AssignSemestersToTeamActionState = {};

type AssignSemestersToTeamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: ManagerSemesterTeamRow[];
  semesters: ManagerSemesterRow[];
  onAssigned: (semesters: ManagerSemesterRow[]) => void;
};

export function AssignSemestersToTeamDialog({
  open,
  onOpenChange,
  teams,
  semesters,
  onAssigned,
}: AssignSemestersToTeamDialogProps) {
  const [teamValue, setTeamValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function resetLocalState() {
    setTeamValue("");
    setSelectedIds(new Set());
  }

  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: assignSemestersToTeamAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        resetLocalState();
        onOpenChange(false);
        if (nextState.semesters && nextState.semesters.length > 0) {
          onAssigned(nextState.semesters);
        }
      },
    });

  function onDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      handleOpenChange(false);
      return;
    }
    if (!nextOpen) {
      resetLocalState();
    }
    handleOpenChange(nextOpen);
  }

  const sortedSemesters = useMemo(
    () =>
      [...semesters].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [semesters]
  );

  const selectedCount = selectedIds.size;

  function toggleSemester(id: string, checked: boolean | "indeterminate") {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamValue || selectedIds.size === 0) {
      return;
    }
    const formData = new FormData();
    formData.set("team_id", teamValue);
    for (const id of selectedIds) {
      formData.append("semester_ids", id);
    }
    formAction(formData);
  }

  const teamError = state.fieldErrors?.team_id?.[0];
  const semestersError = state.fieldErrors?.semester_ids?.[0];

  return (
    <Dialog open={open} onOpenChange={onDialogOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add semesters to team</DialogTitle>
          <DialogDescription>
            Pick a team and the semesters that should belong to it.
          </DialogDescription>
        </DialogHeader>

        <form
          id="assign-semesters-to-team-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="assign-semesters-team"
              label="Team"
              hint="Required"
            />
            <Select
              value={teamValue || null}
              onValueChange={(value) => {
                if (value) {
                  setTeamValue(value);
                }
              }}
              disabled={isPending || teams.length === 0}
            >
              <SelectTrigger
                id="assign-semesters-team"
                aria-invalid={!!teamError}
                className="w-full"
              >
                <SelectValue placeholder="Select a team">
                  {(value) =>
                    !value
                      ? "Select a team"
                      : (teams.find((team) => team.id === value)?.name ??
                        "Select a team")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a team before assigning semesters.
              </p>
            ) : null}
            {teamError ? (
              <p className="text-sm text-destructive">{teamError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="assign-semesters-picker"
              label="Semesters"
              hint="Select one or more"
            />
            <div
              id="assign-semesters-picker"
              className="max-h-64 overflow-y-auto rounded-lg border"
            >
              {sortedSemesters.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  No semesters available.
                </p>
              ) : (
                <ul className="divide-y">
                  {sortedSemesters.map((semester) => {
                    const checked = selectedIds.has(semester.id);
                    const checkboxId = `assign-semester-${semester.id}`;
                    return (
                      <li key={semester.id}>
                        <label
                          htmlFor={checkboxId}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            disabled={isPending}
                            onCheckedChange={(next) =>
                              toggleSemester(semester.id, next)
                            }
                            aria-label={`Select ${semester.name}`}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {semester.name}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {semestersError ? (
              <p className="text-sm text-destructive">{semestersError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onDialogOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-semesters-to-team-form"
            disabled={
              isPending ||
              teams.length === 0 ||
              !teamValue ||
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
              "Assign semesters"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
