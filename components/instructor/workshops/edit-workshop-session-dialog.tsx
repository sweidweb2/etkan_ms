"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateWorkshopSessionAction } from "@/app/instructor/workshops/actions";
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
import { Slider } from "@/components/ui/slider";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  WORKSHOP_SESSION_STATUS_LABELS,
  WORKSHOP_SESSION_STATUS_VALUES,
} from "@/lib/constants/manager-workshop-display";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import { cn } from "@/lib/utils";
import {
  hoursFromWorkshopSessionTimes,
  updateWorkshopSessionFormSchema,
  type UpdateWorkshopSessionInput,
} from "@/lib/validators/manager/workshop-session";
import type {
  ManagerWorkshopSessionRow,
  UpdateWorkshopSessionActionState,
} from "@/types/manager-workshop";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

const initialState: UpdateWorkshopSessionActionState = {};

type EditWorkshopSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ManagerWorkshopSessionRow | null;
  onUpdated: () => void;
};

function toTimeInput(value: string): string {
  return value.slice(0, 5);
}

function toFormDefaults(session: ManagerWorkshopSessionRow) {
  return {
    id: session.id,
    workshop_id: session.workshop_id,
    nb_order: session.nb_order,
    session_date: session.session_date,
    start_time: toTimeInput(session.start_time),
    end_time: toTimeInput(session.end_time),
    nb_hours: session.nb_hours,
    topic: session.topic,
    notes: session.notes,
    suggestions: session.suggestions,
    status: session.status,
    participants_eval: session.participants_eval,
    session_eval: session.session_eval,
  };
}

export function EditWorkshopSessionDialog({
  open,
  onOpenChange,
  session,
  onUpdated,
}: EditWorkshopSessionDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateWorkshopSessionAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
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
    schema: updateWorkshopSessionFormSchema,
    mode: "onBlur",
    defaultValues: session
      ? toFormDefaults(session)
      : {
          id: "",
          workshop_id: "",
          nb_order: 1,
          session_date: "",
          start_time: "09:00",
          end_time: "11:00",
          nb_hours: 2,
          topic: "",
          notes: null,
          suggestions: null,
          status: "planned" as const,
          participants_eval: null,
          session_eval: null,
        },
  });

  const status = watch("status");
  const startTime = watch("start_time");
  const endTime = watch("end_time");
  const participantsEval = watch("participants_eval") as number | null;
  const sessionEval = watch("session_eval") as number | null;

  useEffect(() => {
    if (open && session) {
      reset(toFormDefaults(session));
    }
  }, [open, session, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const derived = hoursFromWorkshopSessionTimes(startTime ?? "", endTime ?? "");
    if (derived != null) {
      setValue("nb_hours", derived, { shouldValidate: true });
    }
  }, [open, startTime, endTime, setValue]);

  useActionStateSuccess(state, isPending, () => {
    onUpdated();
    onOpenChange(false);
  });

  function onSubmit(values: UpdateWorkshopSessionInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("workshop_id", values.workshop_id);
    formData.set(
      "nb_order",
      values.nb_order == null ? "" : String(values.nb_order)
    );
    formData.set("session_date", values.session_date);
    formData.set("start_time", values.start_time);
    formData.set("end_time", values.end_time);
    formData.set("nb_hours", String(values.nb_hours));
    formData.set("topic", values.topic.trim());
    formData.set("notes", values.notes ?? "");
    formData.set("suggestions", values.suggestions ?? "");
    formData.set("status", values.status);
    formData.set(
      "participants_eval",
      values.participants_eval == null ? "" : String(values.participants_eval)
    );
    formData.set(
      "session_eval",
      values.session_eval == null ? "" : String(values.session_eval)
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  if (!session) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Update session #{session.nb_order} details.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-workshop-session-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("workshop_id")} />
          <input type="hidden" {...register("nb_order")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-session-date"
                label="Session date"
                hint="Required"
              />
              <Input
                id="edit-session-date"
                type="date"
                disabled={isPending}
                aria-invalid={!!errors.session_date}
                {...register("session_date")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="edit-session-status" label="Status" hint="Required" />
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue("status", value as typeof status, {
                    shouldValidate: true,
                  })
                }
                disabled={isPending}
              >
                <SelectTrigger id="edit-session-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOP_SESSION_STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {WORKSHOP_SESSION_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="edit-session-start" label="Start" hint="Required" />
              <Input
                id="edit-session-start"
                type="time"
                disabled={isPending}
                {...register("start_time")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="edit-session-end" label="End" hint="Required" />
              <Input
                id="edit-session-end"
                type="time"
                disabled={isPending}
                {...register("end_time")}
              />
              {errors.end_time?.message ? (
                <p className="text-sm text-destructive">{errors.end_time.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="edit-session-hours" label="Hours" hint="Required" />
              <Input
                id="edit-session-hours"
                type="number"
                step="0.01"
                min={WORKSHOP_FIELD_LIMITS.session_hours.min}
                max={WORKSHOP_FIELD_LIMITS.session_hours.max}
                disabled={isPending}
                {...register("nb_hours")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-session-topic" label="Topic" hint="Required" />
            <Input
              id="edit-session-topic"
              maxLength={WORKSHOP_FIELD_LIMITS.session_topic.max}
              disabled={isPending}
              {...register("topic")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-session-notes" label="Notes" hint="Optional" />
            <textarea
              id="edit-session-notes"
              rows={3}
              maxLength={WORKSHOP_FIELD_LIMITS.session_notes.max}
              disabled={isPending}
              className={textareaClassName}
              {...register("notes")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-session-suggestions"
              label="Suggestions"
              hint="Optional"
            />
            <textarea
              id="edit-session-suggestions"
              rows={3}
              maxLength={WORKSHOP_FIELD_LIMITS.session_suggestions.max}
              disabled={isPending}
              className={textareaClassName}
              {...register("suggestions")}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel
                htmlFor="edit-session-participants-eval"
                label="Participants eval"
                hint="1–10"
              />
              <span className="text-sm font-medium tabular-nums">
                {participantsEval ?? "—"}
              </span>
            </div>
            <Slider
              id="edit-session-participants-eval"
              min={1}
              max={10}
              value={participantsEval ?? 5}
              disabled={isPending}
              onValueChange={(value) =>
                setValue("participants_eval", value, { shouldValidate: true })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={isPending || participantsEval == null}
              onClick={() =>
                setValue("participants_eval", null, { shouldValidate: true })
              }
            >
              Clear
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel
                htmlFor="edit-session-session-eval"
                label="Session eval"
                hint="1–10"
              />
              <span className="text-sm font-medium tabular-nums">
                {sessionEval ?? "—"}
              </span>
            </div>
            <Slider
              id="edit-session-session-eval"
              min={1}
              max={10}
              value={sessionEval ?? 5}
              disabled={isPending}
              onValueChange={(value) =>
                setValue("session_eval", value, { shouldValidate: true })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={isPending || sessionEval == null}
              onClick={() =>
                setValue("session_eval", null, { shouldValidate: true })
              }
            >
              Clear
            </Button>
          </div>

          {state.error && !state.fieldErrors ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-workshop-session-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
