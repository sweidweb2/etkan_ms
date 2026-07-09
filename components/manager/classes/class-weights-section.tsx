"use client";

import { useMemo } from "react";
import { useZodForm } from "@/hooks/use-zod-form";
import { PercentIcon } from "lucide-react";
import { FieldLabel } from "@/components/auth/field-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDefaultManagerClassWeights } from "@/lib/constants/manager-class-weights-mock";
import { setPreviewClassWeights } from "@/lib/preview/manager-class-weights-store";
import { showSuccessToast } from "@/lib/toast";
import {
  updateClassWeightsSchema,
  type UpdateClassWeightsInput,
} from "@/lib/validators/manager/update-class-weights";
import type { ManagerClassWeightsRow } from "@/types/manager-class-weights";

type ClassWeightsSectionProps = {
  classId: string;
  className: string;
  initialWeights?: ManagerClassWeightsRow | null;
};

type ClassWeightsFormProps = {
  className: string;
  weights: ManagerClassWeightsRow;
};

function toFormValues(weights: ManagerClassWeightsRow): UpdateClassWeightsInput {
  return {
    group_weight: String(weights.group_weight),
    final_exam_weight: String(weights.final_exam_weight),
    tasks_weight: String(weights.tasks_weight),
    attendee_weight: String(weights.attendee_weight),
  };
}

function parseWeight(value: string) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getWeightsFormKey(weights: ManagerClassWeightsRow) {
  return [
    weights.class_id,
    weights.group_weight,
    weights.final_exam_weight,
    weights.tasks_weight,
    weights.attendee_weight,
  ].join(":");
}

function ClassWeightsForm({ className, weights }: ClassWeightsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useZodForm({
    schema: updateClassWeightsSchema,
    mode: "onBlur",
    defaultValues: toFormValues(weights),
  });

  const watchedValues = watch();
  const totalWeight = useMemo(
    () =>
      parseWeight(watchedValues.group_weight ?? "") +
      parseWeight(watchedValues.final_exam_weight ?? "") +
      parseWeight(watchedValues.tasks_weight ?? "") +
      parseWeight(watchedValues.attendee_weight ?? ""),
    [
      watchedValues.attendee_weight,
      watchedValues.final_exam_weight,
      watchedValues.group_weight,
      watchedValues.tasks_weight,
    ]
  );

  function onSubmit(values: UpdateClassWeightsInput) {
    const nextWeights: ManagerClassWeightsRow = {
      class_id: weights.class_id,
      group_weight: Number(values.group_weight),
      final_exam_weight: Number(values.final_exam_weight),
      tasks_weight: Number(values.tasks_weight),
      attendee_weight: Number(values.attendee_weight),
    };

    setPreviewClassWeights(nextWeights);
    reset(values);
    showSuccessToast(`${className} weights updated.`);
  }

  function handleResetDefaults() {
    const defaultWeights = getDefaultManagerClassWeights(weights.class_id);
    setPreviewClassWeights(defaultWeights);
    reset(toFormValues(defaultWeights));
    showSuccessToast("Class weights reset to 25% each.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="class-group-weight"
            label="Group weight"
            hint="Percent"
          />
          <Input
            id="class-group-weight"
            type="number"
            min={0}
            max={100}
            step={0.5}
            aria-invalid={!!errors.group_weight}
            {...register("group_weight")}
          />
          {errors.group_weight ? (
            <p className="text-sm text-destructive">{errors.group_weight.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="class-final-exam-weight"
            label="Final exam weight"
            hint="Percent"
          />
          <Input
            id="class-final-exam-weight"
            type="number"
            min={0}
            max={100}
            step={0.5}
            aria-invalid={!!errors.final_exam_weight}
            {...register("final_exam_weight")}
          />
          {errors.final_exam_weight ? (
            <p className="text-sm text-destructive">
              {errors.final_exam_weight.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="class-tasks-weight"
            label="Tasks weight"
            hint="Percent"
          />
          <Input
            id="class-tasks-weight"
            type="number"
            min={0}
            max={100}
            step={0.5}
            aria-invalid={!!errors.tasks_weight}
            {...register("tasks_weight")}
          />
          {errors.tasks_weight ? (
            <p className="text-sm text-destructive">{errors.tasks_weight.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="class-attendee-weight"
            label="Attendance weight"
            hint="Percent"
          />
          <Input
            id="class-attendee-weight"
            type="number"
            min={0}
            max={100}
            step={0.5}
            aria-invalid={!!errors.attendee_weight}
            {...register("attendee_weight")}
          />
          {errors.attendee_weight ? (
            <p className="text-sm text-destructive">{errors.attendee_weight.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Weights total</p>
          <p className="text-sm text-muted-foreground">
            Current total: <span className="font-medium text-foreground">{totalWeight}%</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleResetDefaults}>
            Reset to 25% each
          </Button>
          <Button type="submit" disabled={!isDirty}>
            Save weights
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ClassWeightsSection({
  classId,
  className,
  initialWeights,
}: ClassWeightsSectionProps) {
  const fallbackWeights = useMemo(
    () => getDefaultManagerClassWeights(classId),
    [classId]
  );
  const resolvedInitialWeights = initialWeights ?? fallbackWeights;

  return (
    <Card className="py-0">
      <CardHeader className="border-b bg-muted/40 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <PercentIcon className="size-4" />
          </div>
          <div>
            <CardTitle>Class weights</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure how group work, final exam, tasks, and attendance contribute to the class grade.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-3">
        <ClassWeightsForm
          key={getWeightsFormKey(resolvedInitialWeights)}
          className={className}
          weights={resolvedInitialWeights}
        />
      </CardContent>
    </Card>
  );
}
