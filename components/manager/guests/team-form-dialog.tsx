"use client";

import { useActionState, useEffect, useTransition } from "react";
import {
  createTeamAction,
  updateTeamAction,
} from "@/app/manager/guests/actions";
import { FieldLabel } from "@/components/auth/field-label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  TEAM_DEFAULT_STATUS,
  TEAM_STATUS_LABELS,
  TEAM_STATUS_VALUES,
} from "@/lib/constants/team";
import {
  createTeamSchema,
  type CreateTeamInput,
} from "@/lib/validators/manager/create-team";
import type {
  CreateTeamActionState,
  ManagerTeamRow,
  UpdateTeamActionState,
} from "@/types/manager-team";

const initialCreateState: CreateTeamActionState = {};
const initialUpdateState: UpdateTeamActionState = {};

const emptyDefaults: CreateTeamInput = {
  name: "",
  expected_start_date: null,
  status: TEAM_DEFAULT_STATUS,
};

type TeamFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null opens the dialog in create mode. */
  team: ManagerTeamRow | null;
  onSaved: (team: ManagerTeamRow) => void;
};

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  onSaved,
}: TeamFormDialogProps) {
  const isEdit = team !== null;
  const [isTransitionPending, startTransition] = useTransition();
  const [createState, createFormAction, isCreatePending] = useActionState(
    createTeamAction,
    initialCreateState
  );
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateTeamAction,
    initialUpdateState
  );

  const state = isEdit ? updateState : createState;
  const isPending =
    isTransitionPending || (isEdit ? isUpdatePending : isCreatePending);
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: createTeamSchema,
    mode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const status = watch("status");

  useEffect(() => {
    if (!open) {
      return;
    }
    reset(
      team
        ? {
            name: team.name,
            expected_start_date: team.expected_start_date,
            status: team.status,
          }
        : emptyDefaults
    );
  }, [open, team, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.team) {
      onSaved(nextState.team);
    }
  });

  function onSubmit(values: CreateTeamInput) {
    const formData = new FormData();
    if (team) {
      formData.set("id", team.id);
    }
    formData.set("name", values.name.trim());
    formData.set("expected_start_date", values.expected_start_date ?? "");
    formData.set("status", values.status);

    startTransition(() => {
      if (team) {
        updateFormAction(formData);
      } else {
        createFormAction(formData);
      }
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const dateError =
    errors.expected_start_date?.message ??
    state.fieldErrors?.expected_start_date?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit team" : "Create team"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the team name, expected start date, or status."
              : "Name the team and optionally set when it is expected to start. Drag guests into it afterwards."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="team-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="team-name" label="Team name" hint="Required" />
            <Input
              id="team-name"
              placeholder="Summer cohort A"
              disabled={isPending}
              aria-invalid={Boolean(nameError)}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel
              htmlFor="team-expected-start-date"
              label="Expected start date"
              hint="Optional"
            />
            <Input
              id="team-expected-start-date"
              type="date"
              disabled={isPending}
              aria-invalid={Boolean(dateError)}
              {...register("expected_start_date")}
            />
            {dateError ? (
              <p className="text-sm text-destructive">{dateError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="team-status" label="Status" hint="Required" />
            <Select
              value={status}
              disabled={isPending}
              onValueChange={(value) => {
                if (value == null) return;
                setValue("status", value as CreateTeamInput["status"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger id="team-status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TEAM_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="team-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner />
                {isEdit ? "Saving" : "Creating"}
              </>
            ) : isEdit ? (
              "Save team"
            ) : (
              "Create team"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
