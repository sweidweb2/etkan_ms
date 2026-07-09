"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FieldLabel } from "@/components/auth/field-label";
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
  buildDefaultTaskWeights,
  type FactorWeightsForm,
  parseWeight,
  toFactorWeightValues,
  validateFactorWeights,
  validateTaskWeights,
} from "@/lib/compute/custom-compute-form-utils";
import { getDefaultManagerClassWeights } from "@/lib/constants/manager-class-weights-mock";
import { getManagerClassTasksPreview } from "@/lib/manager/get-manager-class-tasks-preview";
import { cn } from "@/lib/utils";

type CustomizeComputeAllDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  pendingCount: number;
  onConfirm: (values: {
    factorWeights: ReturnType<typeof toFactorWeightValues>;
    taskWeights: Record<string, string>;
  }) => void;
};

export function CustomizeComputeAllDialog({
  open,
  onOpenChange,
  classId,
  className,
  pendingCount,
  onConfirm,
}: CustomizeComputeAllDialogProps) {
  const classTasks = useMemo(() => getManagerClassTasksPreview(classId), [classId]);
  const defaultFactors = useMemo(
    () => getDefaultManagerClassWeights(classId),
    [classId]
  );
  const defaultTaskWeights = useMemo(
    () => buildDefaultTaskWeights(classTasks),
    [classTasks]
  );

  const [taskWeights, setTaskWeights] = useState<Record<string, string>>(
    defaultTaskWeights
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [pendingFactorValues, setPendingFactorValues] =
    useState<FactorWeightsForm | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FactorWeightsForm>({
    defaultValues: {
      group_weight: String(defaultFactors.group_weight),
      final_exam_weight: String(defaultFactors.final_exam_weight),
      tasks_weight: String(defaultFactors.tasks_weight),
      attendee_weight: String(defaultFactors.attendee_weight),
    },
  });

  const factorValues = watch();
  const factorTotal = useMemo(
    () =>
      parseWeight(factorValues.group_weight ?? "") +
      parseWeight(factorValues.final_exam_weight ?? "") +
      parseWeight(factorValues.tasks_weight ?? "") +
      parseWeight(factorValues.attendee_weight ?? ""),
    [factorValues]
  );

  const taskTotal = useMemo(
    () =>
      classTasks.reduce(
        (sum, task) => sum + parseWeight(taskWeights[task.id] ?? "0"),
        0
      ),
    [classTasks, taskWeights]
  );

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setIsConfirmStep(false);
      setPendingFactorValues(null);
      setFormError(null);
      reset({
        group_weight: String(defaultFactors.group_weight),
        final_exam_weight: String(defaultFactors.final_exam_weight),
        tasks_weight: String(defaultFactors.tasks_weight),
        attendee_weight: String(defaultFactors.attendee_weight),
      });
      setTaskWeights(defaultTaskWeights);
    }

    onOpenChange(nextOpen);
  }

  function handleReview(values: FactorWeightsForm) {
    const factorError = validateFactorWeights(values);
    if (factorError) {
      setFormError(factorError);
      return;
    }

    const taskError = validateTaskWeights(classTasks, taskWeights);
    if (taskError) {
      setFormError(taskError);
      return;
    }

    setFormError(null);
    setPendingFactorValues(values);
    setIsConfirmStep(true);
  }

  function handleConfirm() {
    if (!pendingFactorValues) {
      return;
    }

    onConfirm({
      factorWeights: toFactorWeightValues(pendingFactorValues),
      taskWeights,
    });
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[min(90vh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>
              {isConfirmStep ? "Confirm customize compute all" : "Customize compute all"}
            </DialogTitle>
            <DialogDescription>
              {isConfirmStep
                ? `Apply these temporary weights to all ${pendingCount} pending students in ${className}. Nothing is saved permanently.`
                : `Set temporary factor and task weights, then compute all pending students in ${className}.`}
            </DialogDescription>
          </DialogHeader>

          {isConfirmStep && pendingFactorValues ? (
            <div className="grid gap-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <h4 className="text-sm font-medium">Factor weights</h4>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Group</dt>
                    <dd className="font-medium">{pendingFactorValues.group_weight}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Final exam</dt>
                    <dd className="font-medium">
                      {pendingFactorValues.final_exam_weight}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tasks</dt>
                    <dd className="font-medium">{pendingFactorValues.tasks_weight}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Attendance</dt>
                    <dd className="font-medium">
                      {pendingFactorValues.attendee_weight}%
                    </dd>
                  </div>
                </dl>
              </div>

              {classTasks.length > 0 ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="text-sm font-medium">Task weights</h4>
                  <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
                    {classTasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="min-w-0 truncate text-muted-foreground">
                          {task.session_label} · {task.title}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {taskWeights[task.id] ?? "0"}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <form
              id="customize-compute-all-form"
              onSubmit={handleSubmit(handleReview)}
              className="flex flex-col gap-6"
              noValidate
            >
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">Grade factor weights</h4>
                  <p className="text-xs text-muted-foreground">
                    Must total 100% across group, tasks, attendance, and final exam.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <FieldLabel
                      htmlFor="customize-group-weight"
                      label="Group weight"
                      hint="Percent"
                    />
                    <Input
                      id="customize-group-weight"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      aria-invalid={!!errors.group_weight}
                      {...register("group_weight")}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel
                      htmlFor="customize-final-exam-weight"
                      label="Final exam weight"
                      hint="Percent"
                    />
                    <Input
                      id="customize-final-exam-weight"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      aria-invalid={!!errors.final_exam_weight}
                      {...register("final_exam_weight")}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel
                      htmlFor="customize-tasks-weight"
                      label="Tasks weight"
                      hint="Percent"
                    />
                    <Input
                      id="customize-tasks-weight"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      aria-invalid={!!errors.tasks_weight}
                      {...register("tasks_weight")}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel
                      htmlFor="customize-attendee-weight"
                      label="Attendance weight"
                      hint="Percent"
                    />
                    <Input
                      id="customize-attendee-weight"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      aria-invalid={!!errors.attendee_weight}
                      {...register("attendee_weight")}
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Factor total:{" "}
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      Math.abs(factorTotal - 100) > 0.001
                        ? "text-destructive"
                        : "text-foreground"
                    )}
                  >
                    {factorTotal}%
                  </span>
                </p>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <h4 className="text-sm font-semibold">Per-task weights</h4>
                  <p className="text-xs text-muted-foreground">
                    One weight per task across all class sessions. Must total 100%.
                  </p>
                </div>

                {classTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    No tasks found for this class yet.
                  </p>
                ) : (
                  <div className="grid max-h-56 gap-3 overflow-y-auto sm:grid-cols-2">
                    {classTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-2 rounded-xl border bg-muted/15 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.session_label} · max {task.max_grade ?? "—"}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={taskWeights[task.id] ?? ""}
                          onChange={(event) => {
                            setTaskWeights((current) => ({
                              ...current,
                              [task.id]: event.target.value,
                            }));
                          }}
                          aria-label={`Weight for ${task.title}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {classTasks.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Task total:{" "}
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        Math.abs(taskTotal - 100) > 0.001
                          ? "text-destructive"
                          : "text-foreground"
                      )}
                    >
                      {taskTotal}%
                    </span>
                  </p>
                ) : null}
              </div>

              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
            </form>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/30 p-4 sm:justify-end">
          {isConfirmStep ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmStep(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                className="bg-orange-500 text-white hover:bg-orange-500/90"
                onClick={handleConfirm}
              >
                Confirm
              </Button>
            </>
          ) : (
            <Button type="submit" form="customize-compute-all-form">
              Review compute all
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
