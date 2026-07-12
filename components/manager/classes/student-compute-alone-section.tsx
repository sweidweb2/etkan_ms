"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { CalculatorIcon } from "lucide-react";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
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
  buildFactorWeightsFormFromClassWeights,
  toFactorWeightValues,
  type FactorWeightsForm,
  parseWeight,
  validateFactorWeights,
  validateTaskWeights,
} from "@/lib/compute/custom-compute-form-utils";
import { DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS } from "@/lib/constants/manager-class-grade-defaults";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import { computeStudentGradeAloneAction } from "@/app/manager/classes/grades/actions";

type StudentComputeAloneSectionProps = {
  classId: string;
  userId: string;
  studentName: string;
  classTasks: ManagerClassTaskForGradesRow[];
};

export function StudentComputeAloneSection({
  classId,
  userId,
  studentName,
  classTasks,
}: StudentComputeAloneSectionProps) {
  const router = useRouter();
  const defaultFactors = useMemo(
    () => ({
      class_id: classId,
      tasks_weight: DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.tasks_weight,
      final_exam_weight: DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.final_exam_weight,
    }),
    [classId]
  );
  const defaultFactorForm = useMemo(
    () => buildFactorWeightsFormFromClassWeights(defaultFactors),
    [defaultFactors]
  );
  const defaultTaskWeights = useMemo(
    () => buildDefaultTaskWeights(classTasks),
    [classTasks]
  );

  const [taskWeights, setTaskWeights] = useState<Record<string, string>>(
    defaultTaskWeights
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isConfirmPending, setIsConfirmPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FactorWeightsForm>({
    defaultValues: defaultFactorForm,
  });

  const factorValues = watch();
  const factorTotal = useMemo(
    () =>
      parseWeight(factorValues.tasks_weight ?? "") +
      parseWeight(factorValues.final_exam_weight ?? ""),
    [factorValues.final_exam_weight, factorValues.tasks_weight]
  );

  const taskTotal = useMemo(
    () =>
      classTasks.reduce(
        (sum, task) => sum + parseWeight(taskWeights[task.id] ?? "0"),
        0
      ),
    [classTasks, taskWeights]
  );

  function openConfirmModal(values: FactorWeightsForm) {
    const normalizedValues: FactorWeightsForm = {
      ...values,
      group_weight: "0",
      attendee_weight: "0",
    };
    const factorError = validateFactorWeights(normalizedValues);
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
    setIsConfirmOpen(true);
  }

  async function handleConfirmCompute() {
    setIsConfirmPending(true);

    try {
      const guard = await computeStudentGradeAloneAction(classId, userId, {
        factorWeights: toFactorWeightValues({
          ...factorValues,
          group_weight: "0",
          attendee_weight: "0",
        }),
        taskWeights,
      });

      if (!guard.success) {
        showErrorToast(guard.error ?? "Unable to compute grade.");
        return;
      }

      showSuccessToast(
        guard.message ?? `Computed grade for ${studentName}.`
      );
      setIsConfirmOpen(false);
      router.refresh();
    } finally {
      setIsConfirmPending(false);
    }
  }

  return (
    <ClassTabCollapsibleSection
      title="Compute alone"
      description="Temporary custom weights for a one-off grade calculation saved to student_course_grade."
    >
      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!isConfirmPending) {
            setIsConfirmOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm compute alone</DialogTitle>
            <DialogDescription>
              Run a direct calculation for {studentName} using the temporary
              weights below. These values will not be saved.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <h4 className="text-sm font-medium">Factor weights</h4>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Tasks</dt>
                  <dd className="font-medium">{factorValues.tasks_weight}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Final exam</dt>
                  <dd className="font-medium">{factorValues.final_exam_weight}%</dd>
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

          <DialogFooter showCloseButton>
            <Button
              type="button"
              disabled={isConfirmPending}
              onClick={handleConfirmCompute}
            >
              {isConfirmPending ? <InlineSpinner className="mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form
        onSubmit={handleSubmit(openConfirmModal)}
        className="flex flex-col gap-6 p-5"
        noValidate
      >
        <input type="hidden" {...register("group_weight")} value="0" />
        <input type="hidden" {...register("attendee_weight")} value="0" />

        <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/15 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-300">
            <CalculatorIcon className="size-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            Adjust factor and per-task weights for this student only. Use
            Recompute to calculate and save the course grade using these
            weights.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Grade factor weights</h4>
            <p className="text-xs text-muted-foreground">
              Tasks and final exam must total 100%. Group and attendance are not used yet.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="compute-alone-tasks-weight"
                label="Tasks weight"
                hint="Percent"
              />
              <Input
                id="compute-alone-tasks-weight"
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
                htmlFor="compute-alone-final-exam-weight"
                label="Final exam weight"
                hint="Percent"
              />
              <Input
                id="compute-alone-final-exam-weight"
                type="number"
                min={0}
                max={100}
                step={0.5}
                aria-invalid={!!errors.final_exam_weight}
                {...register("final_exam_weight")}
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

        <div className="space-y-4 border-t pt-6">
          <div>
            <h4 className="text-sm font-semibold">Per-task weights</h4>
            <p className="text-xs text-muted-foreground">
              One weight per task across all class sessions. Must total 100%.
            </p>
          </div>

          {classTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No tasks found for this class yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
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

        <div className="flex justify-end border-t pt-4">
          <Button type="submit">Recompute</Button>
        </div>
      </form>
    </ClassTabCollapsibleSection>
  );
}
